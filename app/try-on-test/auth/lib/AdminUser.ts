import mongoose, { Schema, type Model } from "mongoose";

/**
 * Admin user for the try-on-test lab. Single user, no roles, no email.
 * Username + bcrypt-hashed password. Not connected to the main user
 * collection — the only thing this account does is unlock /try-on-test.
 */

export interface AdminUserDoc {
  username: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

const adminUserSchema = new Schema<AdminUserDoc>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, collection: "tryontestadmins" },
);

export const AdminUserModel: Model<AdminUserDoc> =
  (mongoose.models.TryOnTestAdmin as Model<AdminUserDoc>) ||
  mongoose.model<AdminUserDoc>("TryOnTestAdmin", adminUserSchema);
