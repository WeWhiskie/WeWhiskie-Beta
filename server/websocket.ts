import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { TastingSession } from '@shared/schema';
import { log } from './vite';
import { IncomingMessage } from 'http';
import { parse } from 'cookie';
import { verify } from './auth';

interface Client {
  ws: WebSocket;
  userId: number;
  sessionId?: number;
  isHost?: boolean;
  lastPing?: number;
  connectTime: number;
  bytesTransferred: number;
}

type WebSocketMessage = {
  type: 'join-session' | 'leave-session' | 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'heartbeat' | 'broadcast-ready' | 'request-offer';
  payload: any;
};

export class LiveStreamingServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client> = new Map();
  private sessions: Map<number, Set<WebSocket>> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_CONNECTIONS_PER_SESSION = 100;
  private readonly RATE_LIMIT_WINDOW = 1000; // 1 second
  private readonly MAX_MESSAGES_PER_WINDOW = 100;
  private messageCounters: Map<WebSocket, { count: number; timestamp: number }> = new Map();

  constructor(server: Server) {
    log('Initializing WebSocket server...', 'websocket');
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
    });

    this.setupWebSocketServer();
    this.startHeartbeatCheck();
    this.startMetricsCollection();

    log('WebSocket server initialized and ready for connections', 'websocket');
  }

  private findHostClient(sessionId: number): Client | undefined {
    const clientEntries = Array.from(this.clients.entries());
    for (const [, client] of clientEntries) {
      if (client.sessionId === sessionId && client.isHost) {
        return client;
      }
    }
    return undefined;
  }

  private async verifyClient(
    info: { origin: string; secure: boolean; req: IncomingMessage },
    callback: (res: boolean, code?: number, message?: string) => void
  ) {
    try {
      const cookies = parse(info.req.headers.cookie || '');
      const sessionId = cookies['connect.sid'];

      // If no session cookie, reject the connection
      if (!sessionId) {
        log('WebSocket connection rejected: No session cookie', 'websocket');
        callback(false, 401, 'Unauthorized');
        return;
      }

      // Verify the session
      const user = await verify(sessionId);
      if (!user) {
        log('WebSocket connection rejected: Invalid session', 'websocket');
        callback(false, 401, 'Unauthorized');
        return;
      }

      log(`WebSocket connection authorized for user ${user.id}`, 'websocket');
      callback(true);
    } catch (error) {
      log(`WebSocket verification error: ${error}`, 'websocket');
      callback(false, 500, 'Internal Server Error');
    }
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      try {
        const cookies = parse(request.headers.cookie || '');
        const user = await verify(cookies['connect.sid']);

        if (!user) {
          log('Connection rejected: User not authenticated', 'websocket');
          ws.close(1008, 'User not authenticated');
          return;
        }

        log(`New WebSocket connection established for user ${user.id}`, 'websocket');

        // Initialize client metrics
        this.clients.set(ws, {
          ws,
          userId: user.id,
          connectTime: Date.now(),
          bytesTransferred: 0,
        });

        ws.on('message', async (message: string) => {
          try {
            if (this.isRateLimited(ws)) {
              log('Rate limit exceeded for client', 'websocket');
              ws.send(JSON.stringify({ 
                type: 'error', 
                payload: 'Rate limit exceeded' 
              }));
              return;
            }

            const data: WebSocketMessage = JSON.parse(message.toString());
            log(`Received message type: ${data.type} from user ${user.id}`, 'websocket');
            await this.handleMessage(ws, data);

            const client = this.clients.get(ws);
            if (client) {
              client.bytesTransferred += message.length;
            }
          } catch (error) {
            log(`Error handling message: ${error}`, 'websocket');
            ws.send(JSON.stringify({ 
              type: 'error', 
              payload: 'Invalid message format' 
            }));
          }
        });

        ws.on('close', () => {
          const client = this.clients.get(ws);
          if (client?.sessionId) {
            this.handleLeaveSession(ws, client.sessionId);
          }
          this.clients.delete(ws);
          this.messageCounters.delete(ws);
          log(`WebSocket connection closed for user ${user.id}`, 'websocket');
        });

        ws.on('error', (error) => {
          log(`WebSocket error for user ${user.id}: ${error}`, 'websocket');
          this.handleConnectionError(ws);
        });

        // Send initial connection success message
        ws.send(JSON.stringify({ 
          type: 'connection-established',
          payload: { 
            userId: user.id,
            timestamp: Date.now() 
          }
        }));

        this.sendHeartbeat(ws);
      } catch (error) {
        log(`Error handling WebSocket connection: ${error}`, 'websocket');
        ws.close(1011, 'Internal Server Error');
      }
    });
  }

  private isRateLimited(ws: WebSocket): boolean {
    const now = Date.now();
    const counter = this.messageCounters.get(ws) || { count: 0, timestamp: now };

    if (now - counter.timestamp > this.RATE_LIMIT_WINDOW) {
      counter.count = 1;
      counter.timestamp = now;
    } else if (counter.count >= this.MAX_MESSAGES_PER_WINDOW) {
      return true;
    } else {
      counter.count++;
    }

    this.messageCounters.set(ws, counter);
    return false;
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client) return;

    log(`Handling message type: ${message.type}`, 'websocket');

    switch (message.type) {
      case 'join-session':
        await this.handleJoinSession(ws, message.payload);
        break;

      case 'leave-session':
        if (client?.sessionId) {
          this.handleLeaveSession(ws, client.sessionId);
        }
        break;

      case 'broadcast-ready':
        if (client?.isHost && client?.sessionId) {
          this.broadcastToSession(client.sessionId, {
            type: 'broadcast-ready',
            payload: { userId: client.userId }
          });
        }
        break;

      case 'request-offer':
        if (client?.sessionId) {
          const hostClient = this.findHostClient(client.sessionId);
          if (hostClient) {
            hostClient.ws.send(JSON.stringify({
              type: 'request-offer',
              payload: { userId: client.userId }
            }));
          }
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

  private broadcastToSession(sessionId: number, message: any, exclude?: WebSocket) {
    const clients = this.sessions.get(sessionId);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);

        // Update bytes transferred
        const clientInfo = this.clients.get(client);
        if (clientInfo) {
          clientInfo.bytesTransferred += messageStr.length;
        }
      }
    });
  }

  private startHeartbeatCheck() {
    setInterval(() => {
      const clientEntries = Array.from(this.clients.entries());
      for (const [ws] of clientEntries) {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendHeartbeat(ws);
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private sendHeartbeat(ws: WebSocket) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  private handleWebRTCSignaling(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client?.sessionId) return;

    log(`Handling WebRTC signaling: ${message.type}`, 'websocket');
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
    });
  }

  private handleConnectionError(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client?.sessionId) {
      this.handleLeaveSession(ws, client.sessionId);
    }
    ws.terminate();
  }

  private startMetricsCollection() {
    setInterval(async () => {
      const sessionEntries = Array.from(this.sessions.entries());

      for (const [sessionId, clients] of sessionEntries) {
        try {
          const activeConnections = clients.size;
          const clientsArray = Array.from(clients);

          const totalBytesTransferred = clientsArray.reduce((total: number, clientWs: WebSocket) => {
            const client = this.clients.get(clientWs);
            return total + (client?.bytesTransferred || 0);
          }, 0);

          await storage.recordStreamStats({
            sessionId,
            currentViewers: activeConnections,
            peakViewers: activeConnections,
            bandwidth: totalBytesTransferred,
            cpuUsage: process.cpuUsage().user / 1000000,
            memoryUsage: process.memoryUsage().heapUsed,
            streamHealth: 100, // Calculate based on connection quality
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('Error recording stream stats:', error);
        }
      }
    }, 60000); // Every minute
  }

  private async handleJoinSession(ws: WebSocket, payload: { userId: number; sessionId: number }) {
    const { userId, sessionId } = payload;
    log(`User ${userId} attempting to join session ${sessionId}`, 'websocket');

    const session = await this.validateSession(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Session not found or not active' }));
      return;
    }

    // Check session capacity
    const currentParticipants = this.sessions.get(sessionId)?.size || 0;
    if (currentParticipants >= this.MAX_CONNECTIONS_PER_SESSION) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Session is at maximum capacity' }));
      return;
    }

    // Set up client info
    this.clients.set(ws, {
      ws,
      userId,
      sessionId,
      isHost: session.hostId === userId,
      connectTime: Date.now(),
      bytesTransferred: 0,
    });

    // Add to session room
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
    }
    this.sessions.get(sessionId)?.add(ws);

    log(`User ${userId} successfully joined session ${sessionId}`, 'websocket');

    // Notify others in the session
    this.broadcastToSession(sessionId, {
      type: 'user-joined',
      payload: { userId }
    }, ws);

    // If this is a viewer and host is already connected, request an offer
    const hostClient = this.findHostClient(sessionId);
    if (hostClient && session.hostId !== userId) {
      hostClient.ws.send(JSON.stringify({
        type: 'request-offer',
        payload: { userId }
      }));
    }
  }

  private handleLeaveSession(ws: WebSocket, sessionId: number) {
    const client = this.clients.get(ws);
    if (!client) return;

    log(`User ${client.userId} leaving session ${sessionId}`, 'websocket');

    this.sessions.get(sessionId)?.delete(ws);
    if (this.sessions.get(sessionId)?.size === 0) {
      this.sessions.delete(sessionId);
    }

    this.broadcastToSession(sessionId, {
      type: 'user-left',
      payload: { userId: client.userId }
    });
  }

  private async validateSession(sessionId: number): Promise<TastingSession | undefined> {
    try {
      const session = await storage.getTastingSession(sessionId);
      if (!session || session.status !== 'live') {
        log(`Invalid session ${sessionId}: ${session ? 'not live' : 'not found'}`, 'websocket');
        return undefined;
      }
      return session;
    } catch (error) {
      log(`Error validating session ${sessionId}: ${error}`, 'websocket');
      return undefined;
    }
  }
}