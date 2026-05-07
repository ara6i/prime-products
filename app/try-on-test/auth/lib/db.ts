import mongoose from "mongoose";

/**
 * Lazy, cached mongoose connection for the try-on-test admin auth.
 * Uses MONGO_URI (same string as the backend) so we don't have to copy
 * credentials across .env files. The connection is module-level cached
 * so repeated route invocations on the same Node process reuse it.
 */

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function getDb(): Promise<typeof mongoose> {
  if (!connectionPromise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("[try-on-test:auth] MONGO_URI is not set");
    }
    connectionPromise = mongoose.connect(uri, {
      // Keep the same DB name backend uses; admin users live in their own
      // collection (`tryontestadmins`) so they don't interfere with the
      // primary user collection.
      bufferCommands: false,
    });
  }
  return connectionPromise;
}
