import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth } from "./auth";
import { storage } from "./storage";
import { insertLeadSchema, updateLeadSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Lead routes - all protected by authentication
  
  // Create lead
  app.post("/api/leads", requireAuth, async (req, res, next) => {
    try {
  const validatedData = insertLeadSchema.parse(req.body);
  const lead = await storage.createLead(validatedData, (req as any).user.id);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  // Get leads with filters and pagination
  app.get("/api/leads", requireAuth, async (req, res, next) => {
    try {
      const {
        page = "1",
        limit = "20",
        search,
        status,
        source,
        scoreMin,
        scoreMax,
        valueMin,
        valueMax,
        isQualified,
        createdAfter,
        createdBefore,
        lastActivityAfter,
        lastActivityBefore,
        sortBy = "createdAt",
        sortOrder = "desc"
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const filters = {
        search: search as string,
        status: status ? (Array.isArray(status) ? status : [status]) as string[] : undefined,
        source: source ? (Array.isArray(source) ? source : [source]) as string[] : undefined,
        scoreMin: scoreMin ? parseInt(scoreMin as string) : undefined,
        scoreMax: scoreMax ? parseInt(scoreMax as string) : undefined,
        valueMin: valueMin ? parseFloat(valueMin as string) : undefined,
        valueMax: valueMax ? parseFloat(valueMax as string) : undefined,
        isQualified: isQualified === "true" ? true : isQualified === "false" ? false : undefined,
        createdAfter: createdAfter ? new Date(createdAfter as string) : undefined,
        createdBefore: createdBefore ? new Date(createdBefore as string) : undefined,
        lastActivityAfter: lastActivityAfter ? new Date(lastActivityAfter as string) : undefined,
        lastActivityBefore: lastActivityBefore ? new Date(lastActivityBefore as string) : undefined,
      };

      const pagination = {
        page: pageNum,
        limit: limitNum,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await storage.getLeads(filters, pagination);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Get single lead
  app.get("/api/leads/:id", requireAuth, async (req, res, next) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      next(error);
    }
  });

  // Update lead
  app.put("/api/leads/:id", requireAuth, async (req, res, next) => {
    try {
      const validatedData = updateLeadSchema.parse(req.body);
      const lead = await storage.updateLead(req.params.id, validatedData);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", requireAuth, async (req, res, next) => {
    try {
      const success = await storage.deleteLead(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
