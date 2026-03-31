// src/lib/mongodb.ts

import { MongoClient, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// --- OPTIMIZED CONFIGURATION FOR LIGHTSAIL/AWS ---
// These settings prevent the "stale connection" and 504 errors on AWS
const options: MongoClientOptions = {
  maxPoolSize: 10,                // Limit connections to save RAM (Crucial for Lightsail)
  serverSelectionTimeoutMS: 20000, // Fail fast (20s) instead of hanging indefinitely
  socketTimeoutMS: 60000,         // Close idle connections to prevent "Zombie" sockets
  family: 4                       // Force IPv4 to prevent AWS IPv6 lookup timeouts
};
// -------------------------------------------------

// Helper to handle DB Name extraction safely
const getDbConfig = (uriString: string) => {
  const uriObj = new URL(uriString);
  const dbName = uriObj.pathname.substring(1) || 'billzzyDB';
  return { uri: uriString, dbName };
}

// --- MONGOOSE CACHE (For Application Logic) ---
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = global as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose.mongoose || { conn: null, promise: null };

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const { uri, dbName } = getDbConfig(MONGODB_URI!);

    console.log(`Connecting to Mongoose [DB: ${dbName}]...`);

    const mongooseOpts = {
      ...options,
      dbName: dbName,
      bufferCommands: false,
    };

    // The FIX: We cast 'mongooseOpts' to 'mongoose.ConnectOptions' 
    // to resolve the TypeScript dependency mismatch.
    cached.promise = mongoose.connect(uri, mongooseOpts as mongoose.ConnectOptions).then((mongooseInstance) => {
      console.log('✅ Mongoose Connected');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset promise on failure so we try again next time
    console.error("❌ Mongoose Connection Error:", e);
    throw e;
  }

  return cached.conn;
}

// --- MONGOCLIENT (For NextAuth) ---
const { uri } = getDbConfig(MONGODB_URI!);

const getMongoClientPromise = (): Promise<MongoClient> => {
  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }
    if (!globalWithMongo._mongoClientPromise) {
      console.log('Initializing MongoClient (Dev)...');
      const client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // PRODUCTION MODE
    console.log('Initializing MongoClient (Prod)...');
    const client = new MongoClient(uri, options);
    return client.connect().catch(err => {
      console.error("❌ MongoDB Connection Failed:", err);
      throw err;
    });
  }
};

const clientPromise = getMongoClientPromise();

export { clientPromise };
export default dbConnect;