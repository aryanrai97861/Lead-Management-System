import { storage } from "./storage";
import { type InsertLead, leads as leadsTable } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

function randomChoice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedLeadsForUser(userId: string, options?: { count?: number; force?: boolean }) {
  const count = options?.count ?? 100;

  // If force is requested, delete leads for this user first
  if (options?.force) {
    try {
      await db.delete(leadsTable).where(eq(leadsTable.userId, userId));
    } catch (err) {
      console.error("Error deleting existing leads for user:", err);
      throw err;
    }
  } else {
    // If the user already has leads, skip seeding
    if (storage.getLeadsForUser) {
      const existing = await storage.getLeadsForUser({}, { page: 1, limit: 1 }, userId);
      if (existing && existing.data && existing.data.length > 0) {
        return { skipped: true, reason: "user already has leads" };
      }
    }
  }

  const firstNames = ["John", "Jane", "Alex", "Emily", "Chris", "Taylor", "Jordan", "Morgan", "Casey", "Riley"];
  const lastNames = ["Smith", "Johnson", "Brown", "Williams", "Jones", "Davis", "Miller", "Wilson", "Moore", "Taylor"];
  const companies = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark", "Wayne", "Wonka", "Soylent", "Cyberdyne"];
  const cities = ["New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Seattle", "Boston", "Denver", "Miami", "Atlanta"];
  const states = ["NY", "CA", "IL", "TX", "WA", "MA", "CO", "FL", "GA", "PA"];
  const sources = ["website", "facebook_ads", "google_ads", "referral", "events", "other"] as const;
  const statuses = ["new", "contacted", "qualified", "lost", "won"] as const;

  const leadsToCreate: InsertLead[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randomInt(1, 9999)}@example.com`;

    const lead: InsertLead = {
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
    } as unknown as InsertLead;

    leadsToCreate.push(lead);
  }

  // Perform bulk inserts in chunks for speed and visibility
  const rows = leadsToCreate.map((l) => ({
    ...l,
    leadValue: l.leadValue !== undefined ? l.leadValue.toString() : undefined,
    userId,
    updatedAt: new Date(),
  }));

  function chunkArray<T>(arr: T[], size: number) {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }

  const CHUNK_SIZE = 50; // adjust if needed
  const chunks = chunkArray(rows, CHUNK_SIZE);

  for (const c of chunks) {
    try {
      await db.insert(leadsTable).values(c as any).returning();
    } catch (err) {
      // Fall back to inserting individually if bulk insert fails for some rows
      console.error("Bulk insert failed for a chunk, falling back to individual inserts:", err);
      for (const r of c) {
        try {
          await storage.createLead(r as any, userId);
        } catch (innerErr) {
          console.error("Failed to insert lead during fallback:", innerErr);
        }
      }
    }
  }

  return { seeded: true, count };
}

export default seedLeadsForUser;
