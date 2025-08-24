import "dotenv/config";
import { storage } from "../server/storage";
import { type InsertLead, leads as leadsTable } from "../shared/schema";
import { hashPassword } from "../server/auth";
import { db } from "../server/db";
import { randomUUID } from "crypto";

function randomChoice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Seeding database...");

  const username = process.env.SEED_USERNAME || "testuser";
  const password = process.env.SEED_PASSWORD || "Test1234";

  // Create or get user
  let user = await storage.getUserByUsername(username) as any;

  if (!user) {
    const hashed = await hashPassword(password);
    user = await storage.createUser({ username, password: hashed });
    console.log(`Created test user: ${username}`);
  } else {
    console.log(`Test user already exists: ${username}`);
  }

  const force = process.argv.includes("--force") || process.env.FORCE_SEED === "true";

  // If forcing, delete all existing leads first
  if (force) {
    console.log("Force reseed requested — deleting all existing leads...");
    try {
      const result = await db.delete(leadsTable);
      // result may contain rowCount depending on driver
      // eslint-disable-next-line no-console
      console.log(`Deleted leads result: ${JSON.stringify(result ?? {})}`);
    } catch (err) {
      console.error("Error deleting existing leads:", err);
      process.exit(1);
    }
  } else {
    // Create 100 leads if not already present
    const { data: existingLeads } = await storage.getLeads({}, { page: 1, limit: 1 });
    if (existingLeads && existingLeads.length > 0) {
      console.log("Leads already exist in database; skipping seeding leads.");
      return process.exit(0);
    }
  }

  const firstNames = ["John","Jane","Alex","Emily","Chris","Taylor","Jordan","Morgan","Casey","Riley"];
  const lastNames = ["Smith","Johnson","Brown","Williams","Jones","Davis","Miller","Wilson","Moore","Taylor"];
  const companies = ["Acme","Globex","Initech","Umbrella","Hooli","Stark","Wayne","Wonka","Soylent","Cyberdyne"];
  const cities = ["New York","San Francisco","Los Angeles","Chicago","Austin","Seattle","Boston","Denver","Miami","Atlanta"];
  const states = ["NY","CA","IL","TX","WA","MA","CO","FL","GA","PA"];
  const sources = ["website","facebook_ads","google_ads","referral","events","other"] as const;
  const statuses = ["new","contacted","qualified","lost","won"] as const;

  const leadsToCreate: InsertLead[] = [];

  for (let i = 0; i < 100; i++) {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randomInt(1,9999)}@example.com`;

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

  for (const l of leadsToCreate) {
    await storage.createLead(l);
  }

  console.log("Seeded 100 leads.");
  console.log(`Test user: ${username} / ${password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
