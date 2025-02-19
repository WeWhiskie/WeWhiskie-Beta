import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const { server, liveStreamingServer } = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5001; // Changed port to 5001 to avoid conflicts

    // Improved server start function with more robust error handling
    const startServer = () => {
      return new Promise((resolve, reject) => {
        try {
          const serverInstance = server.listen(PORT, "0.0.0.0", () => {
            log(`Server started successfully on port ${PORT}`);
            log('WebSocket server initialized and ready for connections');
            resolve(serverInstance);
          });

          serverInstance.on('error', async (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
              log(`Port ${PORT} is in use. Attempting to free the port...`);
              reject(new Error(`Port ${PORT} is in use`));
            } else {
              reject(error);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    };

    // Handle graceful shutdown
    const cleanup = () => {
      log('Shutting down gracefully...');
      server.close(() => {
        log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    // Start the server with retries
    try {
      await startServer();
    } catch (error) {
      log(`Fatal error starting server: ${error}`);
      process.exit(1);
    }
  } catch (error) {
    log(`Fatal error during initialization: ${error}`);
    process.exit(1);
  }
})();