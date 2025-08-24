import jwt from "jsonwebtoken";
import { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "fallback-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

// Password hashing functions
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(password: string, hash: string): Promise<boolean> {
  const [hashedPassword, salt] = hash.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

// JWT functions
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Middleware to extract user from JWT
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.auth_token;

  if (!token) {
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    // Clear invalid token
    res.clearCookie("auth_token");
    return next();
  }

  try {
    const user = await storage.getUser(decoded.userId);
    if (user) {
      req.user = user;
    }
  } catch (error) {
    console.error("Error fetching user:", error);
  }

  next();
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "No authentication token provided" });
  }
  next();
}

export function setupAuth(app: Express) {
  // Apply authentication middleware to all routes
  app.use(authenticateToken);

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = generateToken(user.id);

      // Set httpOnly cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = generateToken(user.id);

      // Set httpOnly cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.sendStatus(200);
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}
