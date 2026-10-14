const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 10000,
    };

    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://Kaifshere:Kaif444@cluster0.bogyqa2.mongodb.net/attendance-system?retryWrites=true&w=majority';

    cached.promise = mongoose.connect(mongoUri, opts).then((m) => {
      console.log(`MongoDB Connected: ${m.connection.host}`);
      return m.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;

