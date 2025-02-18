import { useEffect, useRef, useState } from 'react';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

type WebRTCMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'chat';
  payload: any;
};

export function useWebRTC(isHost: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const peerConnections = useRef<Map<number, RTCPeerConnection>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isHost) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(setStream)
        .catch(setError);
    }

    return () => {
      stream?.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, [isHost]);

  const connectToSocket = (sessionId: number, userId: number) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join-session',
        payload: { sessionId, userId }
      }));
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      handleSocketMessage(message);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  };

  const handleSocketMessage = async (message: WebRTCMessage) => {
    const { type, payload } = message;

    switch (type) {
      case 'request-offer':
        if (isHost && stream) {
          const pc = createPeerConnection(payload.userId);
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendMessage('offer', { userId: payload.userId, sdp: offer });
        }
        break;

      case 'offer':
        if (!isHost) {
          const pc = createPeerConnection(payload.userId);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendMessage('answer', { userId: payload.userId, sdp: answer });
        }
        break;

      case 'answer':
        const pc = peerConnections.current.get(payload.userId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
        break;

      case 'ice-candidate':
        const connection = peerConnections.current.get(payload.userId);
        if (connection) {
          await connection.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
        break;
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

    if (!isHost) {
      pc.ontrack = (event) => {
        setStream(event.streams[0]);
      };
    }

    peerConnections.current.set(userId, pc);
    return pc;
  };

  const sendMessage = (type: WebRTCMessage['type'], payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  return {
    stream,
    error,
    connectToSocket,
    sendMessage
  };
}