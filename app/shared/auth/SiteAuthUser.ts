import mongoose, { Schema, type Model } from "mongoose";

export interface SiteAuthUserDoc {
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const siteAuthUserSchema = new Schema<SiteAuthUserDoc>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "primeproductssiteusers",
  },
);

export const SiteAuthUserModel: Model<SiteAuthUserDoc> =
  (mongoose.models.PrimeProductsSiteAuthUser as Model<SiteAuthUserDoc>) ||
  mongoose.model<SiteAuthUserDoc>("PrimeProductsSiteAuthUser", siteAuthUserSchema);
