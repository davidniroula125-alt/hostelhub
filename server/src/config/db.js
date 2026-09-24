const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 20000
    });
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('[db] MongoDB connection error:', err.message);
    throw err;
  }
};

module.exports = connectDB;