import dotenv from "dotenv";
import { pool } from "../server/db";

dotenv.config();

(async function main() {
  try {
    console.log("Dropping unique constraint/index for leads.email if it exists...");
    // Drop constraint if it exists (this is the typical name from the error message)
    await pool.query('ALTER TABLE IF EXISTS leads DROP CONSTRAINT IF EXISTS leads_email_unique');
    // Also drop any index with the same name just in case
    await pool.query('DROP INDEX IF EXISTS leads_email_unique');
    console.log("Done. If the constraint/index existed it was removed.");
  } catch (err) {
    console.error("Failed to drop constraint/index:", err);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
  }
})();
