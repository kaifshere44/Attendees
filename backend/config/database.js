const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // 1. Check if global connection is active
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // 2. Check if cached connection is still active
  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
  }

  // 3. If disconnected or stale, reset cached references
  if (cached.conn && cached.conn.readyState === 0) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000, // Safely reap idle sockets on serverless / cloud
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 10000,
      family: 4, // Fast IPv4 resolution
    };

    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://Kaifshere:Kaif444@cluster0.bogyqa2.mongodb.net/attendance-system?retryWrites=true&w=majority';
    const localUri = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/attendance-system';

    cached.promise = mongoose.connect(mongoUri, opts)
      .then((m) => {
        console.log(`MongoDB Connected: ${m.connection.host}`);
        return m.connection;
      })
      .catch(async (atlasErr) => {
        if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
          console.warn(`Primary MongoDB connection failed (${atlasErr.message}). Attempting local fallback: ${localUri}`);
          try {
            const localM = await mongoose.connect(localUri, opts);
            console.log(`MongoDB Connected (Local Fallback): ${localM.connection.host}`);
            return localM.connection;
          } catch (localErr) {
            console.error(`Local MongoDB fallback error: ${localErr.message}`);
            throw atlasErr;
          }
        }
        throw atlasErr;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;

