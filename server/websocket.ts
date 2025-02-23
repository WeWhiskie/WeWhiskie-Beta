import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';
import { parse } from 'cookie';
import { verify } from './auth';

interface Client {
  ws: WebSocket;
  userId: number;
  lastPing: number;
  connectTime: number;
}

export class LiveStreamingServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000;

  constructor(server: Server) {
    log('Initializing WebSocket server...', 'websocket');

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.setupWebSocketServer();
    this.startHeartbeatCheck();

    log('WebSocket server initialized and ready for connections', 'websocket');
  }

  private async verifyClient(
    info: { origin: string; secure: boolean; req: any },
    callback: (res: boolean, code?: number, message?: string) => void
  ) {
    try {
      // Enhanced logging for debugging
      log('WebSocket verification started', 'websocket');
      const cookies = parse(info.req.headers.cookie || '');
      log(`Received cookies: ${Object.keys(cookies).join(', ')}`, 'websocket');

      // Try multiple session cookie names
      const sessionId = cookies['whisky.session.id'] || cookies['connect.sid'];

      if (!sessionId) {
        log('No session cookie found', 'websocket');
        callback(false, 401, 'Unauthorized - No session cookie');
        return;
      }

      log(`Session ID found: ${sessionId}`, 'websocket');

      // Extract clean session ID
      const cleanSessionId = sessionId.split('.')[0].replace('s:', '');
      log(`Cleaned session ID: ${cleanSessionId}`, 'websocket');

      const user = await verify(cleanSessionId);

      if (!user) {
        log('Invalid session - User not found', 'websocket');
        callback(false, 401, 'Unauthorized - Invalid session');
        return;
      }

      log(`User verified: ${user.id}`, 'websocket');
      info.req.user = user;
      callback(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`WebSocket verification error: ${errorMessage}`, 'websocket');
      callback(false, 500, 'Internal Server Error');
    }
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: WebSocket, request: any) => {
      try {
        if (!request.user) {
          log('Missing user in request', 'websocket');
          ws.close(1008, 'User not authenticated');
          return;
        }

        const userId = request.user.id;
        log(`New WebSocket connection established for user ${userId}`, 'websocket');

        // Initialize client tracking
        this.clients.set(ws, {
          ws,
          userId,
          lastPing: Date.now(),
          connectTime: Date.now(),
        });

        // Send initial connection confirmation
        ws.send(JSON.stringify({
          type: 'CONNECTED',
          userId,
          timestamp: Date.now()
        }));

        // Handle incoming messages
        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            log(`Received message from user ${userId}: ${JSON.stringify(data)}`, 'websocket');

            // Echo back for testing
            ws.send(JSON.stringify({
              type: 'ECHO',
              data,
              timestamp: Date.now()
            }));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log(`Message handling error: ${errorMessage}`, 'websocket');
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: 'Failed to process message'
            }));
          }
        });

        // Handle pong messages to update last ping time
        ws.on('pong', () => {
          const client = this.clients.get(ws);
          if (client) {
            client.lastPing = Date.now();
          }
        });

        // Handle connection close
        ws.on('close', () => {
          log(`WebSocket connection closed for user ${userId}`, 'websocket');
          this.clients.delete(ws);
        });

        // Handle errors
        ws.on('error', (error) => {
          log(`WebSocket error for user ${userId}: ${error}`, 'websocket');
          this.clients.delete(ws);
          ws.terminate();
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Error in WebSocket connection handler: ${errorMessage}`, 'websocket');
        ws.close(1011, 'Internal Server Error');
      }
    });
  }

  private startHeartbeatCheck() {
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, ws) => {
        if (now - client.lastPing > this.HEARTBEAT_INTERVAL * 1.5) {
          log(`Client timeout detected for user ${client.userId}`, 'websocket');
          ws.terminate();
          return;
        }

        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }
}