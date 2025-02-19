import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Optimize request logging middleware
app.use((req, res, next) => {
  // Only log API requests to reduce overhead
  if (req.path.startsWith("/api")) {
    const start = Date.now();
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      let logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    });
  }
  next();
});

(async () => {
  try {
    // Register routes first to minimize startup time
    const { server, liveStreamingServer } = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      log(`Error: ${message}`, 'error');
    });

    // Use port 5000 to match workflow expectations
    const PORT = 5000;

    // Improved server start function with more robust error handling
    const startServer = () => {
      return new Promise((resolve, reject) => {
        try {
          log('Starting server...', 'express');
          const serverInstance = server.listen(PORT, "0.0.0.0", () => {
            log(`Server started successfully on port ${PORT}`, 'express');
            log('WebSocket server initialized and ready for connections', 'websocket');
            resolve(serverInstance);
          });

          serverInstance.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
              log(`Port ${PORT} is in use. Please check if another instance is running.`, 'error');
              reject(new Error(`Port ${PORT} is in use`));
            } else {
              log(`Server error: ${error.message}`, 'error');
              reject(error);
            }
          });
        } catch (error) {
          log(`Failed to start server: ${error}`, 'error');
          reject(error);
        }
      });
    };

    // Handle graceful shutdown
    const cleanup = () => {
      log('Shutting down gracefully...', 'express');
      server.close(() => {
        log('Server closed', 'express');
        process.exit(0);
      });
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    // Start the server and setup Vite or static serving
    try {
      await startServer();
      // Setup Vite after server is listening to reduce startup time
      if (app.get("env") === "development") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }
    } catch (error) {
      log(`Fatal error: ${error}`, 'error');
      process.exit(1);
    }
  } catch (error) {
    log(`Initialization error: ${error}`, 'error');
    process.exit(1);
  }
})();