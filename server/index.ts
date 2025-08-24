import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import cookieParser from "cookie-parser";
import { seedLeadsForUser } from "./seeder";
import { storage } from "./storage";
import { hashPassword } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Add this line

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyObj, ...args) {
    capturedJsonResponse = bodyObj;
    return originalResJson.apply(res, [bodyObj, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        console.log(logLine, capturedJsonResponse);
      } else {
        console.log(logLine);
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the API routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT || "5000", 10);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  // Optional seeding on startup (useful for deployed test environments)
  if (process.env.SEED_ON_STARTUP === "true") {
    (async () => {
      try {
        const username = process.env.SEED_USERNAME || "testuser";
        const password = process.env.SEED_PASSWORD || "Test1234";

        let user = await storage.getUserByUsername(username) as any;
        if (!user) {
          const hashed = await hashPassword(password);
          user = await storage.createUser({ username, password: hashed });
          console.log(`Created seed user ${username}`);
        } else {
          console.log(`Seed user already exists: ${username}`);
        }

        const seedResult = await seedLeadsForUser(user.id, { count: 100, force: false });
        console.log("Startup seed result:", seedResult);
      } catch (err) {
        console.error("Error during startup seeding:", err);
      }
    })();
  }
})();