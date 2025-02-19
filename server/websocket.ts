import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { TastingSession } from '@shared/schema';
import { performance } from 'perf_hooks';
import { streamTranscoder } from './services/transcoder';

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
  type: 'join-session' | 'leave-session' | 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'heartbeat' | 'start-stream' | 'end-stream';
  payload: any;
};

export class LiveStreamingServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client> = new Map();
  private sessions: Map<number, Set<WebSocket>> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_CONNECTIONS_PER_SESSION = 100000;
  private readonly RATE_LIMIT_WINDOW = 1000; // 1 second
  private readonly MAX_MESSAGES_PER_WINDOW = 100;
  private messageCounters: Map<WebSocket, { count: number; timestamp: number }> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: true,
    });

    this.setupWebSocketServer();
    this.startHeartbeatCheck();
    this.startMetricsCollection();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: WebSocket, request) => {
      console.log('New WebSocket connection attempt');

      // Initialize client metrics
      this.clients.set(ws, {
        ws,
        userId: 0, // Will be set when joining session
        connectTime: Date.now(),
        bytesTransferred: 0,
      });

      ws.on('message', async (message: string) => {
        try {
          // Rate limiting check
          if (this.isRateLimited(ws)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              payload: 'Rate limit exceeded' 
            }));
            return;
          }

          const data: WebSocketMessage = JSON.parse(message);
          await this.handleMessage(ws, data);

          // Update bytes transferred
          const client = this.clients.get(ws);
          if (client) {
            client.bytesTransferred += message.length;
          }
        } catch (error) {
          console.error('Error handling message:', error);
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
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleConnectionError(ws);
      });

      // Send initial heartbeat
      this.sendHeartbeat(ws);
    });
  }

  private isRateLimited(ws: WebSocket): boolean {
    const now = Date.now();
    const counter = this.messageCounters.get(ws) || { count: 0, timestamp: now };

    if (now - counter.timestamp > this.RATE_LIMIT_WINDOW) {
      // Reset counter for new window
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

    switch (message.type) {
      case 'join-session':
        await this.handleJoinSession(ws, message.payload);
        break;

      case 'leave-session':
        if (client?.sessionId) {
          this.handleLeaveSession(ws, client.sessionId);
        }
        break;

      case 'start-stream':
        if (client?.isHost && client?.sessionId) {
          await this.handleStartStream(client.sessionId, message.payload.streamUrl);
        }
        break;

      case 'end-stream':
        if (client?.isHost && client?.sessionId) {
          await this.handleEndStream(client.sessionId);
        }
        break;

      case 'heartbeat':
        this.handleHeartbeat(ws);
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

    // Record analytics
    await this.recordJoinAnalytics(sessionId, userId);

    // Notify others in the session
    this.broadcastToSession(sessionId, {
      type: 'user-joined',
      payload: { userId }
    }, ws);

    // Request offer from host if needed
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

    // Record analytics for the session
    this.recordLeaveAnalytics(sessionId, client);

    this.broadcastToSession(sessionId, {
      type: 'user-left',
      payload: { userId: client.userId }
    }, ws);
  }

  private async handleStartStream(sessionId: number, streamUrl: string) {
    try {
      await streamTranscoder.startTranscoding(sessionId, streamUrl);

      this.broadcastToSession(sessionId, {
        type: 'stream-started',
        payload: {
          sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error starting stream:', error);
      this.broadcastToSession(sessionId, {
        type: 'error',
        payload: 'Failed to start stream'
      });
    }
  }

  private async handleEndStream(sessionId: number) {
    try {
      await streamTranscoder.stopTranscoding(sessionId);

      this.broadcastToSession(sessionId, {
        type: 'stream-ended',
        payload: {
          sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error ending stream:', error);
    }
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
      this.clients.forEach((client, ws) => {
        const now = Date.now();
        if (client.lastPing && now - client.lastPing > this.HEARTBEAT_INTERVAL * 2) {
          // Connection is stale
          console.log('Terminating stale connection');
          ws.terminate();
          return;
        }
        this.sendHeartbeat(ws);
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  private sendHeartbeat(ws: WebSocket) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  private handleHeartbeat(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      client.lastPing = Date.now();
    }
  }

  private handleConnectionError(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client?.sessionId) {
      this.handleLeaveSession(ws, client.sessionId);
    }
    ws.terminate();
  }

  private async recordJoinAnalytics(sessionId: number, userId: number) {
    try {
      await storage.recordViewerAnalytics({
        sessionId,
        userId,
        watchDuration: 0,
        quality: '1080p', // Default quality
        bufferingEvents: 0,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error recording join analytics:', error);
    }
  }

  private async recordLeaveAnalytics(sessionId: number, client: Client) {
    try {
      const watchDuration = Math.floor((Date.now() - client.connectTime) / 1000);
      await storage.recordViewerAnalytics({
        sessionId,
        userId: client.userId,
        watchDuration,
        quality: '1080p',
        bufferingEvents: 0,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error recording leave analytics:', error);
    }
  }

  private startMetricsCollection() {
    setInterval(async () => {
      // Use Array.from to properly type the entries
      const sessionEntries = Array.from(this.sessions.entries());

      for (const [sessionId, clients] of sessionEntries) {
        try {
          const activeConnections = clients.size;
          const clientsArray = Array.from(clients);

          // Properly type the reduce accumulator and handle the WebSocket type
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
}