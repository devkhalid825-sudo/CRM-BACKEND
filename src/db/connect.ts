import mongoose from 'mongoose';
import { env } from '../config/bootstrap.js';

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('✅ MongoDB connected successfully to:', env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'));
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️ MongoDB disconnected');
  });

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
