import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  prepare: false, // Required for Supabase pooler
  max: 1,
});

async function test() {
  try {
    const result = await sql`SELECT current_database(), current_user, version()`;
    console.log("✓ Database connection successful");
    console.log("  Database:", result[0].current_database);
    console.log("  User:", result[0].current_user);
    console.log(
      "  Version:",
      result[0].version.split(" ").slice(0, 2).join(" ")
    );
    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("✗ Database connection failed:", err.message);
    process.exit(1);
  }
}

test();
