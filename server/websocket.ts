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
      const cookies = parse(info.req.headers.cookie || '');
      const sessionId = cookies['whisky.session.id'];

      if (!sessionId) {
        log('WebSocket connection rejected: No session cookie', 'websocket');
        callback(false, 401, 'Unauthorized - No session cookie');
        return;
      }

      const cleanSessionId = sessionId.split('.')[0].replace('s:', '');
      const user = await verify(cleanSessionId);

      if (!user) {
        log('WebSocket connection rejected: Invalid session', 'websocket');
        callback(false, 401, 'Unauthorized - Invalid session');
        return;
      }

      info.req.user = user;
      callback(true);
    } catch (error) {
      console.error('WebSocket verification error:', error);
      callback(false, 500, 'Internal Server Error');
    }
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: WebSocket, request: any) => {
      try {
        if (!request.user) {
          ws.close(1008, 'User not authenticated');
          return;
        }

        const userId = request.user.id;
        log(`New WebSocket connection established for user ${userId}`, 'websocket');

        this.clients.set(ws, {
          ws,
          userId,
          lastPing: Date.now(),
          connectTime: Date.now(),
        });

        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'connection-established',
          userId,
          timestamp: Date.now()
        }));

        // Set up message handler
        ws.on('message', async (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            log(`Received message: ${JSON.stringify(data)}`, 'websocket');

            // Echo back for testing
            ws.send(JSON.stringify({
              type: 'echo',
              data: data,
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Error handling message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to process message'
            }));
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
        console.error('Error handling WebSocket connection:', error);
        ws.close(1011, 'Internal Server Error');
      }
    });
  }

  private startHeartbeatCheck() {
    setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat' }));
          client.lastPing = Date.now();
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }
}