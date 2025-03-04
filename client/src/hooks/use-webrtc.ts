import { useEffect, useRef, useState } from 'react';

const configuration: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ]
    }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

type WebRTCPayload = {
  userId: number;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
  message?: string;
  quality?: string;
  timestamp?: number; //Added timestamp
};

type WebRTCMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'request-offer' | 'user-joined' | 'user-left' | 'broadcast-ready' | 'quality-change' | 'CONNECTED' | 'ERROR';
  payload: WebRTCPayload;
};

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 10000;

export function useWebRTC(isHost: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('new');
  const peerConnections = useRef<Map<number, RTCPeerConnection>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const currentQuality = useRef<{ width: number; height: number; frameRate: number }>({
    width: 1280,
    height: 720,
    frameRate: 30
  });

  const initializeMediaStream = async () => {
    try {
      console.log('Initializing media stream...');
      setIsConnecting(true);
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: currentQuality.current.width },
          height: { ideal: currentQuality.current.height },
          frameRate: { ideal: currentQuality.current.frameRate }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Media stream obtained:', mediaStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      setStream(mediaStream);
      return mediaStream;
    } catch (err) {
      console.error('Media stream error:', err);
      const error = err instanceof Error ? err : new Error('Failed to get media stream');
      setError(error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const cleanup = () => {
    console.log('Cleaning up WebRTC resources...');

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      setStream(null);
    }

    peerConnections.current.forEach(pc => {
      if (pc.connectionState !== 'closed') {
        pc.close();
      }
    });
    peerConnections.current.clear();

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.close(1000, 'Normal closure');
    }
    socketRef.current = null;
    setConnectionState('closed');
    reconnectAttempts.current = 0;
  };

  const connectToSocket = (sessionId: number, userId: number) => {
    console.log('Connecting to WebSocket...', { sessionId, userId });

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Closing existing WebSocket connection');
      socketRef.current.close();
    }

    try {
      setIsConnecting(true);
      setError(null);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/ai-concierge`;
      console.log('Connecting to WebSocket URL:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = async () => {
        console.log('WebSocket connected successfully');
        reconnectAttempts.current = 0;
        setConnectionState('connecting');
        setIsReconnecting(false);

        // Send initial connection message with session info
        socket.send(JSON.stringify({
          type: 'join-session',
          payload: { 
            sessionId, 
            userId,
            timestamp: Date.now()
          }
        }));

        if (isHost) {
          try {
            const mediaStream = await initializeMediaStream();
            if (mediaStream) {
              setConnectionState('connected');
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

      socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');

        // Don't reconnect on normal closure or if max attempts reached
        if (event.code !== 1000 && event.code !== 1001) {
          handleReconnect(sessionId, userId);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError(new Error('WebSocket connection failed'));
        setConnectionState('failed');
        handleReconnect(sessionId, userId);
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);

          switch (message.type) {
            case 'CONNECTED':
              console.log('Connection confirmed:', message.payload);
              break;
            case 'ERROR':
              console.error('Server error:', message.payload.message);
              setError(new Error(message.payload.message));
              break;
            default:
              await handleSocketMessage(message);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          setError(error instanceof Error ? error : new Error('Failed to parse WebSocket message'));
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setError(error instanceof Error ? error : new Error('Failed to create WebSocket'));
      setIsConnecting(false);
    }
  };

  const handleReconnect = (sessionId: number, userId: number) => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      setError(new Error('Failed to reconnect after multiple attempts'));
      setIsReconnecting(false);
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    setIsReconnecting(true);
    reconnectAttempts.current++;

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current - 1),
      MAX_RECONNECT_DELAY
    );

    console.log(`Attempting to reconnect in ${delay}ms (Attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
    reconnectTimeout.current = setTimeout(() => {
      connectToSocket(sessionId, userId);
    }, delay);
  };

  const sendMessage = (type: WebRTCMessage['type'], payload: WebRTCPayload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected, message not sent:', type);
    }
  };

  const handleSocketMessage = async (message: WebRTCMessage) => {
    const { type, payload } = message;

    switch (type) {
      case 'broadcast-ready':
        if (!isHost && payload.userId) {
          setConnectionState('connecting');
          sendMessage('request-offer', { userId: payload.userId });
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

      case 'quality-change':
        if (isHost && payload.quality) {
          const [width, height] = payload.quality.split('x').map(Number);
          if (width && height) {
            currentQuality.current = {
              width,
              height,
              frameRate: 30
            };
            await initializeMediaStream();
          }
        }
        break;

      case 'user-joined':
      case 'user-left':
        console.log(`User ${type}:`, payload.userId);
        break;
      case 'ERROR':
          console.error('Server error:', payload.message);
          setError(new Error(payload.message));
          break;
    }
  };

  const createPeerConnection = (userId: number) => {
    console.log('Creating peer connection for user:', userId);
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
      console.log('Connection state changed:', pc.connectionState);
      setConnectionState(pc.connectionState);

      if (pc.connectionState === 'connected') {
        setIsConnecting(false);
        setIsReconnecting(false);
      } else if (pc.connectionState === 'failed') {
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

  const handleRequestOffer = async (userId: number) => {
    try {
      const pc = createPeerConnection(userId);
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
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

  const changeQuality = (quality: string) => {
    const [width, height] = quality.split('x').map(Number);
    if (width && height && socketRef.current?.readyState === WebSocket.OPEN) {
      sendMessage('quality-change', {
        userId: parseInt(socketRef.current.url.split('/').pop() || '0'),
        quality: `${width}x${height}`
      });
    }
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    stream,
    error,
    isConnecting,
    isReconnecting,
    connectionState,
    connectToSocket,
    sendMessage,
    changeQuality,
    peerConnection: peerConnections.current.values().next().value,
    cleanup
  };
}