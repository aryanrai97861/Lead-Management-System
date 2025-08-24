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
export async function hashPassword(password: string): Promise<string> {
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

      // Seed default leads for this new user synchronously so leads are present immediately
      const seedCount = parseInt(process.env.NEW_USER_LEADS || "100", 10);
      try {
        const firstNames = ["John","Jane","Alex","Emily","Chris","Taylor","Jordan","Morgan","Casey","Riley"];
        const lastNames = ["Smith","Johnson","Brown","Williams","Jones","Davis","Miller","Wilson","Moore","Taylor"];
        const companies = ["Acme","Globex","Initech","Umbrella","Hooli","Stark","Wayne","Wonka","Soylent","Cyberdyne"];
        const cities = ["New York","San Francisco","Los Angeles","Chicago","Austin","Seattle","Boston","Denver","Miami","Atlanta"];
        const states = ["NY","CA","IL","TX","WA","MA","CO","FL","GA","PA"];
        const sources = ["website","facebook_ads","google_ads","referral","events","other"] as const;
        const statuses = ["new","contacted","qualified","lost","won"] as const;

        const randomChoice = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
        const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        for (let i = 0; i < seedCount; i++) {
          const firstName = randomChoice(firstNames);
          const lastName = randomChoice(lastNames);
          const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}${i}@example.com`;

          await storage.createLead({
            firstName,
            lastName,
            email,
            phone: `+1${randomInt(2000000000, 9999999999)}`,
            company: randomChoice(companies),
            city: randomChoice(cities),
            state: randomChoice(states),
            source: randomChoice(Array.from(sources)) as any,
            status: randomChoice(Array.from(statuses)) as any,
            score: randomInt(0, 100),
            leadValue: parseFloat((Math.random() * 10000).toFixed(2)),
            lastActivityAt: Math.random() > 0.5 ? new Date(Date.now() - randomInt(0, 1000 * 60 * 60 * 24 * 90)) : undefined,
            isQualified: Math.random() > 0.7,
            userId: user.id,
          } as any);
        }
      } catch (err) {
        console.error("Error seeding leads for new user:", err);
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
