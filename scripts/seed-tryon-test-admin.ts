/**
 * One-off: insert the try-on-test admin user (or update its password if the
 * user already exists). Read MONGO_URI from the same .env the rest of the
 * app uses.
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-tryon-test-admin.ts
 *   # …or, if you don't have a separate scripts tsconfig:
 *   npx tsx scripts/seed-tryon-test-admin.ts
 */
import "dotenv/config";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "primestyleai2026";

const adminUserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, collection: "tryontestadmins" },
);
const AdminUserModel = mongoose.models.TryOnTestAdmin || mongoose.model("TryOnTestAdmin", adminUserSchema);

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in .env");
  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const result = await AdminUserModel.findOneAndUpdate(
    { username: ADMIN_USERNAME },
    { $set: { passwordHash }, $setOnInsert: { username: ADMIN_USERNAME } },
    { upsert: true, new: true },
  );

  console.log(`✓ Admin user "${result.username}" ready (id=${result._id}).`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
