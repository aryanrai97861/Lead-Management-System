import { users, leads, type User, type InsertUser, type Lead, type InsertLead, type UpdateLead } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, gte, lte, between, inArray, desc, asc, count, not } from "drizzle-orm";
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
  createLead(lead: InsertLead, userId?: string): Promise<Lead>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeads(filters: LeadFilters, pagination: PaginationOptions): Promise<PaginatedResponse<Lead>>;
  updateLead(id: string, updates: UpdateLead): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  // variants that can enforce ownership
  getLeadForUser?(id: string, userId: string): Promise<Lead | undefined>;
  getLeadsForUser?(filters: LeadFilters, pagination: PaginationOptions, userId: string): Promise<PaginatedResponse<Lead>>;
  updateLeadForUser?(id: string, updates: UpdateLead, userId: string): Promise<Lead | undefined>;
  deleteLeadForUser?(id: string, userId: string): Promise<boolean>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Simple error class so callers can surface HTTP-like status codes
  private ConflictError(message: string) {
    const err: any = new Error(message);
    err.statusCode = 409;
    return err;
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

  async createLead(insertLead: InsertLead, userId?: string): Promise<Lead> {
    // userId must be provided to associate the lead with a user
    if (!userId) throw new Error("userId is required to create a lead");
    // Check for existing email to avoid duplicate key DB errors

    const insertValues: any = {
      ...insertLead,
      // Drizzle decimal columns are often represented as strings when inserting
      leadValue: insertLead.leadValue !== undefined ? insertLead.leadValue.toString() : undefined,
      updatedAt: new Date(),
      userId,
    };

    const [lead] = await db
      .insert(leads)
      .values(insertValues)
      .returning();
    return lead;
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadForUser(id: string, userId: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
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

    // Get total count (without user filter here; use wrapper if user filtering is needed)
    const [totalResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(whereCondition);

    const total = totalResult.count;

    // Get paginated data
    const offset = (pagination.page - 1) * pagination.limit;
    // Map allowed sort keys to actual column objects to satisfy Drizzle's typing
    const sortableColumns: Record<string, any> = {
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      score: leads.score,
      leadValue: leads.leadValue,
      firstName: leads.firstName,
      lastName: leads.lastName,
    };

    const sortColumn = pagination.sortBy && sortableColumns[pagination.sortBy] ? sortableColumns[pagination.sortBy] : leads.createdAt;
    const orderBy = pagination.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

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

  async getLeadsForUser(filters: LeadFilters, pagination: PaginationOptions, userId: string): Promise<PaginatedResponse<Lead>> {
    // Reuse getLeads logic but enforce userId in the where clause
    const conditions: any[] = [];

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

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(leads.status, filters.status as any));
    }

    if (filters.source && filters.source.length > 0) {
      conditions.push(inArray(leads.source, filters.source as any));
    }

    if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
      if (filters.scoreMin !== undefined && filters.scoreMax !== undefined) {
        conditions.push(between(leads.score, filters.scoreMin, filters.scoreMax));
      } else if (filters.scoreMin !== undefined) {
        conditions.push(gte(leads.score, filters.scoreMin));
      } else if (filters.scoreMax !== undefined) {
        conditions.push(lte(leads.score, filters.scoreMax));
      }
    }

    if (filters.valueMin !== undefined || filters.valueMax !== undefined) {
      if (filters.valueMin !== undefined && filters.valueMax !== undefined) {
        conditions.push(between(leads.leadValue, filters.valueMin.toString(), filters.valueMax.toString()));
      } else if (filters.valueMin !== undefined) {
        conditions.push(gte(leads.leadValue, filters.valueMin.toString()));
      } else if (filters.valueMax !== undefined) {
        conditions.push(lte(leads.leadValue, filters.valueMax.toString()));
      }
    }

    if (filters.isQualified !== undefined) {
      conditions.push(eq(leads.isQualified, filters.isQualified));
    }

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

    // Enforce ownership
    conditions.push(eq(leads.userId, userId));

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(whereCondition);

    const total = totalResult.count;
    const offset = (pagination.page - 1) * pagination.limit;

    const sortableColumns: Record<string, any> = {
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      score: leads.score,
      leadValue: leads.leadValue,
      firstName: leads.firstName,
      lastName: leads.lastName,
    };

    const sortColumn = pagination.sortBy && sortableColumns[pagination.sortBy] ? sortableColumns[pagination.sortBy] : leads.createdAt;
    const orderBy = pagination.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

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

  async updateLeadForUser(id: string, updates: UpdateLead, userId: string): Promise<Lead | undefined> {
    const setValues: any = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.leadValue !== undefined) {
      setValues.leadValue = updates.leadValue.toString();
    }

    const [lead] = await db
      .update(leads)
      .set(setValues)
      .where(and(eq(leads.id, id), eq(leads.userId, userId)))
      .returning();
    return lead;
  }

  async deleteLeadForUser(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
    return !!(result && (result as any).rowCount);
  }

  async updateLead(id: string, updates: UpdateLead): Promise<Lead | undefined> {
    const setValues: any = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.leadValue !== undefined) {
      setValues.leadValue = updates.leadValue.toString();
    }


    const [lead] = await db
      .update(leads)
      .set(setValues)
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: string): Promise<boolean> {
  const result = await db.delete(leads).where(eq(leads.id, id));
  // result.rowCount can be null/undefined depending on the driver; treat truthy as success
  return !!(result && (result as any).rowCount);
  }
}

export const storage = new DatabaseStorage();
