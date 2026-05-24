import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function getSiteAuthDb(): Promise<typeof mongoose> {
  if (!connectionPromise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("[site-auth] MONGO_URI is not set");
    }

    connectionPromise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  return connectionPromise;
}
