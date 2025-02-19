import { useEffect, useRef, useState } from 'react';

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:numb.viagenie.ca',
      username: 'webrtc@live.com',
      credential: 'muazkh'
    }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

type WebRTCPayload = {
  userId: number;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
  message?: string;
};

type WebRTCMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'request-offer' | 'user-joined' | 'user-left' | 'broadcast-ready' | 'stream-started' | 'stream-ended';
  payload: WebRTCPayload;
};

export function useWebRTC(isHost: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('new');
  const peerConnections = useRef<Map<number, RTCPeerConnection>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const activePeerConnection = useRef<RTCPeerConnection | null>(null);

  const initializeMediaStream = async () => {
    try {
      console.log('Initializing media stream...');
      setIsConnecting(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      console.log('Media stream obtained:', mediaStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

      // Apply video constraints for better quality
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('Applying video constraints...');
        await videoTrack.applyConstraints({
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { max: 30 }
        });
      }

      setStream(mediaStream);
      console.log('Media stream initialized successfully');
      return mediaStream;
    } catch (err) {
      console.error('Media stream error:', err);
      setError(err instanceof Error ? err : new Error('Failed to get media stream'));
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const cleanup = () => {
    console.log('Cleaning up WebRTC resources...');
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      setStream(null);
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current?.close();
    }
    socketRef.current = null;
    setConnectionState('closed');
  };

  const connectToSocket = (sessionId: number, userId: number) => {
    console.log('Connecting to WebSocket...', { sessionId, userId });

    // Close existing connection if any
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current = socket;

    socket.onopen = async () => {
      console.log('WebSocket connected');
      reconnectAttempts.current = 0;

      socket.send(JSON.stringify({
        type: 'join-session',
        payload: { sessionId, userId }
      }));

      if (isHost) {
        console.log('Initializing host media stream...');
        try {
          const mediaStream = await initializeMediaStream();
          if (mediaStream) {
            socket.send(JSON.stringify({
              type: 'broadcast-ready',
              payload: { userId }
            }));
          }
        } catch (err) {
          console.error('Failed to initialize host media stream:', err);
          setError(err instanceof Error ? err : new Error('Failed to initialize media stream'));
        }
      }
    };

    socket.onmessage = async (event) => {
      try {
        const message: WebRTCMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', message.type);
        await handleSocketMessage(message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError(new Error('WebSocket connection failed'));
      attemptReconnect(sessionId, userId);
    };

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      if (event.code !== 1000) { // Not a normal closure
        attemptReconnect(sessionId, userId);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      socketRef.current = null;
    };
  };

  const attemptReconnect = (sessionId: number, userId: number) => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setError(new Error('Failed to reconnect after multiple attempts'));
      return;
    }

    setIsReconnecting(true);
    reconnectAttempts.current += 1;

    setTimeout(() => {
      console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
      connectToSocket(sessionId, userId);
    }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000));
  };

  const handleSocketMessage = async (message: WebRTCMessage) => {
    const { type, payload } = message;

    switch (type) {
      case 'broadcast-ready':
        if (isHost && stream) {
          await initiateBroadcast(payload.userId);
        }
        break;

      case 'request-offer':
        if (isHost && stream) {
          await handleRequestOffer(payload.userId);
        }
        break;

      case 'offer':
        if (!isHost) {
          await handleOffer(payload);
        }
        break;

      case 'answer':
        await handleAnswer(payload);
        break;

      case 'ice-candidate':
        await handleIceCandidate(payload);
        break;

      case 'user-joined':
      case 'user-left':
        console.log(`User ${type}:`, payload.userId);
        break;
      case 'stream-started':
      case 'stream-ended':
          console.log(`Stream ${type}:`, payload.userId);
          break;
    }
  };

  const sendMessage = (type: WebRTCMessage['type'], payload: WebRTCPayload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected, message not sent:', type);
    }
  };

  const createPeerConnection = (userId: number) => {
    console.log('Creating peer connection for user:', userId);
    const pc = new RTCPeerConnection(configuration);
    activePeerConnection.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage('ice-candidate', {
          userId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state changed:', pc.connectionState);
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.log('Connection failed, attempting to restart ICE');
        pc.restartIce();
      }
    };

    if (!isHost) {
      pc.ontrack = (event) => {
        console.log('Track received:', event.track.kind);
        setStream(event.streams[0]);
      };
    }

    peerConnections.current.set(userId, pc);
    return pc;
  };

  const initiateBroadcast = async (userId: number) => {
    try {
      const pc = createPeerConnection(userId);
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTransceiver(track, {
            direction: 'sendonly',
            streams: [stream]
          });
        });
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendMessage('offer', { userId, sdp: offer });
    } catch (error) {
      console.error('Error initiating broadcast:', error);
    }
  };

  const handleRequestOffer = async (userId: number) => {
    try {
      const pc = createPeerConnection(userId);
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTransceiver(track, {
            direction: 'sendonly',
            streams: [stream]
          });
        });
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendMessage('offer', { userId, sdp: offer });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async (payload: WebRTCPayload) => {
    try {
      const pc = createPeerConnection(payload.userId);
      if (payload.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage('answer', { userId: payload.userId, sdp: answer });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (payload: WebRTCPayload) => {
    try {
      const pc = peerConnections.current.get(payload.userId);
      if (pc && payload.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (payload: WebRTCPayload) => {
    try {
      const pc = peerConnections.current.get(payload.userId);
      if (pc && payload.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  useEffect(() => {
    console.log('useWebRTC effect triggered, isHost:', isHost);
    return () => {
      cleanup();
    };
  }, [isHost]);


  return {
    stream,
    error,
    isConnecting,
    isReconnecting,
    connectionState,
    connectToSocket,
    sendMessage,
    peerConnection: activePeerConnection.current,
    cleanup
  };
}