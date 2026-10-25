// Sets the role of an existing account. Used to create the first admin, or to make a teacher.
// Usage: npm run role -- <email> <student|teacher|admin>
import { closeDB, connectDB } from "../src/config/database.js";
import { isRole } from "../src/authz/roles.js";
import { updateRoleByEmail } from "../src/models/user.model.js";

const [email, role] = process.argv.slice(2);

if (!email || !isRole(role)) {
  console.error("Usage: npm run role -- <email> <student|teacher|admin>");
  process.exit(1);
}

try {
  await connectDB();
  const updated = await updateRoleByEmail(email, role);
  console.log(updated ? `Set ${email} -> ${role}` : `No account with email ${email}`);
  process.exitCode = updated ? 0 : 1;
} catch (err) {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await closeDB();
}
