// Run: npx tsx src/db/seed.ts
// Creates the first admin user. Run ONCE after pushing the schema.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users } from "./schema";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

async function seed() {
  const passwordHash = await bcrypt.hash("admin123", 12);
  await db.insert(users).values({
    username: "admin",
    passwordHash,
    name: "Administrador",
    role: "admin",
    quotaBytes: 0,
  }).onConflictDoNothing();

  console.log("Admin criado: usuario=admin senha=admin123");
  console.log("IMPORTANTE: Troque a senha após o primeiro login!");
  process.exit(0);
}

seed().catch(console.error);
