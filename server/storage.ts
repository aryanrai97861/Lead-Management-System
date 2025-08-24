import { users, leads, type User, type InsertUser, type Lead, type InsertLead, type UpdateLead } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, gte, lte, between, inArray, desc, asc, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface LeadFilters {
  search?: string;
  status?: string[];
  source?: string[];
  scoreMin?: number;
  scoreMax?: number;
  valueMin?: number;
  valueMax?: number;
  isQualified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastActivityAfter?: Date;
  lastActivityBefore?: Date;
  userId?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeads(filters: LeadFilters, pagination: PaginationOptions): Promise<PaginatedResponse<Lead>>;
  updateLead(id: string, updates: UpdateLead): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values({
        ...insertLead,
        updatedAt: new Date(),
      })
      .returning();
    return lead;
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeads(filters: LeadFilters, pagination: PaginationOptions): Promise<PaginatedResponse<Lead>> {
    const conditions = [];

    // Search filter
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(leads.firstName, searchTerm),
          like(leads.lastName, searchTerm),
          like(leads.email, searchTerm),
          like(leads.company, searchTerm)
        )
      );
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(leads.status, filters.status as any));
    }

    // Owner filter
    if (filters.userId) {
      conditions.push(eq(leads.userId, filters.userId));
    }

    // Source filter
    if (filters.source && filters.source.length > 0) {
      conditions.push(inArray(leads.source, filters.source as any));
    }

    // Score filters
    if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
      if (filters.scoreMin !== undefined && filters.scoreMax !== undefined) {
        conditions.push(between(leads.score, filters.scoreMin, filters.scoreMax));
      } else if (filters.scoreMin !== undefined) {
        conditions.push(gte(leads.score, filters.scoreMin));
      } else if (filters.scoreMax !== undefined) {
        conditions.push(lte(leads.score, filters.scoreMax));
      }
    }

    // Value filters
    if (filters.valueMin !== undefined || filters.valueMax !== undefined) {
      if (filters.valueMin !== undefined && filters.valueMax !== undefined) {
        conditions.push(between(leads.leadValue, filters.valueMin.toString(), filters.valueMax.toString()));
      } else if (filters.valueMin !== undefined) {
        conditions.push(gte(leads.leadValue, filters.valueMin.toString()));
      } else if (filters.valueMax !== undefined) {
        conditions.push(lte(leads.leadValue, filters.valueMax.toString()));
      }
    }

    // Qualified filter
    if (filters.isQualified !== undefined) {
      conditions.push(eq(leads.isQualified, filters.isQualified));
    }

    // Date filters
    if (filters.createdAfter || filters.createdBefore) {
      if (filters.createdAfter && filters.createdBefore) {
        conditions.push(between(leads.createdAt, filters.createdAfter, filters.createdBefore));
      } else if (filters.createdAfter) {
        conditions.push(gte(leads.createdAt, filters.createdAfter));
      } else if (filters.createdBefore) {
        conditions.push(lte(leads.createdAt, filters.createdBefore));
      }
    }

    if (filters.lastActivityAfter || filters.lastActivityBefore) {
      if (filters.lastActivityAfter && filters.lastActivityBefore) {
        conditions.push(between(leads.lastActivityAt, filters.lastActivityAfter, filters.lastActivityBefore));
      } else if (filters.lastActivityAfter) {
        conditions.push(gte(leads.lastActivityAt, filters.lastActivityAfter));
      } else if (filters.lastActivityBefore) {
        conditions.push(lte(leads.lastActivityAt, filters.lastActivityBefore));
      }
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(whereCondition);

    const total = totalResult.count;

    // Get paginated data
    const offset = (pagination.page - 1) * pagination.limit;
    const orderBy = pagination.sortBy 
      ? (pagination.sortOrder === 'desc' ? desc(leads[pagination.sortBy as keyof typeof leads]) : asc(leads[pagination.sortBy as keyof typeof leads]))
      : desc(leads.createdAt);

    const data = await db
      .select()
      .from(leads)
      .where(whereCondition)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(offset);

    return {
      data,
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async updateLead(id: string, updates: UpdateLead): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
