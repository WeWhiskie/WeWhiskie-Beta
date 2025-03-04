import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Extend express session types
declare module 'express-session' {
  interface SessionData {
    passport?: {
      user: number;
    };
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function verify(sessionId: string): Promise<SelectUser | null> {
  try {
    console.log('Verifying session:', sessionId);

    const session = await new Promise<any>((resolve) => {
      storage.sessionStore.get(sessionId, (err, session) => {
        if (err) {
          console.error('Session store error:', err);
          resolve(null);
        } else {
          console.log('Session found:', session ? 'yes' : 'no');
          resolve(session);
        }
      });
    });

    if (!session?.passport?.user) {
      console.log('No user in session');
      return null;
    }

    const user = await storage.getUser(session.passport.user);
    console.log('User found:', user ? 'yes' : 'no');
    return user || null;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

export function setupAuth(app: Express): { sessionStore: any; } {
  const PostgresStore = connectPg(session);

  // Initialize session store with enhanced logging
  const sessionStore = new PostgresStore({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60,
    errorLog: (error: Error) => {
      console.error('Session store error:', error);
    },
  });

  // Enhanced session configuration
  const sessionSettings: session.SessionOptions = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "super-secret-key-change-in-production",
    name: 'whisky.session.id',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/',
    },
  };

  // Initialize session before passport
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Debug middleware with enhanced logging
  app.use((req, res, next) => {
    console.log('Auth Debug:', {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: req.user.id, username: req.user.username } : null,
      cookie: req.session?.cookie,
      headers: {
        cookie: req.headers.cookie,
        authorization: req.headers.authorization
      }
    });
    next();
  });

  // Local strategy setup
  passport.use(
    new LocalStrategy(async (username: string, password: string, done) => {
      try {
        console.log('Attempting authentication for user:', username);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log('User not found:', username);
          return done(null, false, { message: "Invalid username or password" });
        }

        const passwordsMatch = await comparePasswords(password, user.password);

        if (!passwordsMatch) {
          console.log('Password mismatch for user:', username);
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log('Authentication successful for user:', username);
        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }
      console.log('User deserialized successfully:', user.id);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      console.log('Registration attempt - Request body:', {
        username: req.body.username,
        email: req.body.email,
        // Don't log password for security
      });

      if (!req.body.username || !req.body.password || !req.body.email) {
        console.log('Missing required fields:', {
          hasUsername: !!req.body.username,
          hasPassword: !!req.body.password,
          hasEmail: !!req.body.email
        });
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log('Username already exists:', req.body.username);
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        console.log('Email already exists:', req.body.email);
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      console.log('Creating new user:', {
        username: req.body.username,
        email: req.body.email
      });

      // Generate a unique invite code
      const inviteCode = uuidv4().substring(0, 8).toUpperCase();

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        inviteCode,
        isVerified: false,
        isPremium: false,
        level: 1,
        experiencePoints: 0,
        inviteCount: 0,
        engagementScore: 0
      });

      console.log('User created successfully:', {
        id: user.id,
        username: user.username
      });

      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ message: "Error logging in after registration" });
        }
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt for:', req.body.username);

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        console.log('Login failed:', info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ message: "Error creating session" });
        }
        console.log('Login successful for user:', user.username);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    console.log('Logout attempt for user:', username);

    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      console.log('Logout successful for user:', username);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Return the session store for use in WebSocket verification
  return { sessionStore };
}