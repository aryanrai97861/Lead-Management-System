import "dotenv/config";
import { seedLeadsForUser } from "../server/seeder";
import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";

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

  await seedLeadsForUser((user as any).id, { count: 100, force });

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
