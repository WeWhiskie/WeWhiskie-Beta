import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { TastingSession } from '@shared/schema';

interface Client {
  ws: WebSocket;
  userId: number;
  sessionId?: number;
  isHost?: boolean;
}

type WebSocketMessage = {
  type: 'join-session' | 'leave-session' | 'offer' | 'answer' | 'ice-candidate' | 'chat';
  payload: any;
};

export class LiveStreamingServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client> = new Map();
  private sessions: Map<number, Set<WebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection');

      ws.on('message', async (message: string) => {
        try {
          const data: WebSocketMessage = JSON.parse(message);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error handling message:', error);
          ws.send(JSON.stringify({ type: 'error', payload: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        const client = this.clients.get(ws);
        if (client?.sessionId) {
          this.handleLeaveSession(ws, client.sessionId);
        }
        this.clients.delete(ws);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);

    switch (message.type) {
      case 'join-session':
        await this.handleJoinSession(ws, message.payload);
        break;

      case 'leave-session':
        if (client?.sessionId) {
          this.handleLeaveSession(ws, client.sessionId);
        }
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.handleWebRTCSignaling(ws, message);
        break;

      case 'chat':
        this.handleChat(ws, message.payload);
        break;
    }
  }

  private async handleJoinSession(ws: WebSocket, payload: { userId: number; sessionId: number }) {
    const { userId, sessionId } = payload;
    const session = await this.validateSession(sessionId);

    if (!session) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Session not found or not active' }));
      return;
    }

    // Set up client info
    this.clients.set(ws, {
      ws,
      userId,
      sessionId,
      isHost: session.hostId === userId
    });

    // Add to session room
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
    }
    this.sessions.get(sessionId)?.add(ws);

    // Notify others in the session
    this.broadcastToSession(sessionId, {
      type: 'user-joined',
      payload: { userId }
    }, ws);

    // If this is not the host, send an offer request to the host
    const host = Array.from(this.clients.entries()).find(
      ([_, client]) => client.sessionId === sessionId && client.isHost
    )?.[0];

    if (host && !this.clients.get(ws)?.isHost) {
      host.send(JSON.stringify({
        type: 'request-offer',
        payload: { userId }
      }));
    }
  }

  private handleLeaveSession(ws: WebSocket, sessionId: number) {
    const client = this.clients.get(ws);
    if (!client) return;

    this.sessions.get(sessionId)?.delete(ws);
    if (this.sessions.get(sessionId)?.size === 0) {
      this.sessions.delete(sessionId);
    }

    this.broadcastToSession(sessionId, {
      type: 'user-left',
      payload: { userId: client.userId }
    }, ws);
  }

  private handleWebRTCSignaling(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client?.sessionId) return;

    this.broadcastToSession(client.sessionId, message, ws);
  }

  private handleChat(ws: WebSocket, payload: { message: string }) {
    const client = this.clients.get(ws);
    if (!client?.sessionId) return;

    this.broadcastToSession(client.sessionId, {
      type: 'chat',
      payload: {
        userId: client.userId,
        message: payload.message
      }
    }, ws);
  }

  private async validateSession(sessionId: number): Promise<TastingSession | undefined> {
    const session = await storage.getTastingSession(sessionId);
    if (!session || session.status !== 'live') return undefined;
    return session;
  }

  private broadcastToSession(sessionId: number, message: any, exclude?: WebSocket) {
    const clients = this.sessions.get(sessionId);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}