import mongoose from 'mongoose';
import { env } from '../config/env.js';

let isConnected = false;

/**
 * Safely masks database credentials for logging
 */
export function maskMongoUri(uri: string): string {
  return uri.replace(/\/\/[^@]+@/, '//<credentials>@');
}

/**
 * Detects whether the URI targets a MongoDB Atlas Cloud cluster
 */
export function isAtlasUri(uri: string): boolean {
  return uri.startsWith('mongodb+srv://') || uri.includes('.mongodb.net');
}

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  const uri = env.MONGODB_URI;
  const isAtlas = isAtlasUri(uri);
  const clusterType = isAtlas ? 'MongoDB Atlas (Cloud Cluster)' : 'Local / On-Premise MongoDB';
  const maskedUri = maskMongoUri(uri);

  console.log(`🔌 Initializing database connection...`);
  console.log(`   Cluster Type: ${clusterType}`);
  console.log(`   Target URI:   ${maskedUri}`);

  // Setup connection event listeners
  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log(`✅ [MongoDB] Connection established successfully [${clusterType}]`);
  });

  mongoose.connection.on('error', (err: any) => {
    console.error('❌ [MongoDB] Runtime connection error:', err?.message || err);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  [MongoDB] Connection disconnected');
  });

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isAtlas ? 10000 : 5000,
      connectTimeoutMS: 10000,
      autoIndex: env.NODE_ENV !== 'production',
    });
    isConnected = true;
    return conn;
  } catch (error: any) {
    console.error(`\n❌ [MongoDB Connection Error] Failed to connect to ${clusterType}:`);
    console.error(`   URI: ${maskedUri}`);
    console.error(`   Message: ${error?.message || error}`);

    // Actionable diagnostic advice for developers and ops
    if (isAtlas) {
      console.error('\n📋 [Diagnostic Checklist for MongoDB Atlas]:');
      console.error('   1. Verify IP Whitelist: Atlas -> Network Access -> Add IP (0.0.0.0/0 for any or your server IP).');
      console.error('   2. Verify Database User: Atlas -> Database Access -> ensure user and password match .env.');
      console.error('   3. Verify Connection String: Ensure the cluster hostname and database name are correct in .env.\n');
    } else {
      console.error('\n📋 [Diagnostic Checklist for Local MongoDB]:');
      console.error('   1. Linux (Ubuntu): Run "sudo systemctl status mongod" and "sudo systemctl start mongod".');
      console.error('   2. Windows: Run "net start MongoDB" in Administrator prompt, or start MongoDB service.');
      console.error('   3. Docker: Run "docker-compose up -d mongo" if using Docker.\n');
    }

    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('🔌 [MongoDB] Disconnected gracefully');
}
