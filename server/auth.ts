import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { neon } from '@neondatabase/serverless';

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      role: "admin" | "user";
      createdAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);
const PostgresSessionStore = connectPg(session);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log("Comparing passwords...");
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log("Password comparison result:", result);
    return result;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    throw error;
  }
}

async function getUserByUsername(username: string) {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    console.log("Found user:", result[0]?.id || 'not found');
    return result;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
}

export function setupAuth(app: Express) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Create a SQL client with neon
  const sql = neon(process.env.DATABASE_URL);

  // Initialize session store with better error handling
  const store = new PostgresSessionStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
    },
    createTableIfMissing: true,
    tableName: 'session',
    pruneSessionInterval: false // Disable automatic pruning in serverless environment
  });

  // Enhanced session configuration
  const sessionConfig: session.SessionOptions = {
    store,
    secret: process.env.REPL_ID!, // Using REPL_ID as session secret
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: 'auto', // Let Express determine based on request
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    },
    name: 'sid' // Custom session cookie name
  };

  // Trust first proxy if in production
  if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting login for username:", username);
        const [user] = await getUserByUsername(username);

        if (!user) {
          console.log("User not found");
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await comparePasswords(password, user.password);
        console.log("Password validation:", isValid ? "success" : "failed");

        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      console.error("Deserialize error:", error);
      done(error);
    }
  });

  // Login endpoint with enhanced error handling and redirects
  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt received for username:", req.body.username);

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login failed" });
      }

      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      console.log("User authenticated successfully:", user.id);
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Error creating session" });
        }
        console.log("Session created successfully for user:", user.id);

        // Return the user data with a redirect URL
        res.json({
          ...user,
          redirectUrl: '/'
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log("Logout attempt for user:", userId);
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Unauthenticated user request");
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log("Authenticated user request:", req.user?.id);
    res.json(req.user);
  });
}