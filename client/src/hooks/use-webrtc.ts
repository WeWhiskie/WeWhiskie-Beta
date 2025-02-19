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
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
  sdpSemantics: 'unified-plan'
};

type WebRTCPayload = {
  userId: number;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
  message?: string;
};

type WebRTCMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'request-offer' | 'user-joined' | 'user-left' | 'broadcast-ready';
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

  useEffect(() => {
    if (isHost) {
      initializeMediaStream();
    }

    return () => {
      cleanup();
    };
  }, [isHost]);

  const initializeMediaStream = async () => {
    try {
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

      // Apply video constraints for better quality
      const videoTrack = mediaStream.getVideoTracks()[0];
      const constraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { max: 30 },
        bitrateMode: 'variable',
        degradationPreference: 'maintain-framerate'
      };
      await videoTrack.applyConstraints(constraints);

      setStream(mediaStream);
    } catch (err) {
      console.error('Media stream error:', err);
      setError(err instanceof Error ? err : new Error('Failed to get media stream'));
    } finally {
      setIsConnecting(false);
    }
  };

  const cleanup = () => {
    stream?.getTracks().forEach(track => track.stop());
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    socketRef.current?.close();
  };

  const connectToSocket = (sessionId: number, userId: number) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts.current = 0;
      socket.send(JSON.stringify({
        type: 'join-session',
        payload: { sessionId, userId }
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const message: WebRTCMessage = JSON.parse(event.data);
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

    socket.onclose = () => {
      console.log('WebSocket closed');
      attemptReconnect(sessionId, userId);
    };

    return () => {
      socket.close();
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
    }
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

  const createPeerConnection = (userId: number) => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage('ice-candidate', {
          userId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.log('Connection failed, attempting to restart ICE');
        pc.restartIce();
      }
    };

    if (!isHost) {
      pc.ontrack = (event) => {
        setStream(event.streams[0]);
      };
    }

    peerConnections.current.set(userId, pc);
    return pc;
  };

  const sendMessage = (type: WebRTCMessage['type'], payload: WebRTCPayload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  return {
    stream,
    error,
    isConnecting,
    isReconnecting,
    connectionState,
    connectToSocket,
    sendMessage
  };
}