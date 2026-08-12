const mongoose = require('mongoose');
const config = require('./env');

// Include the `id` virtual (stringified _id) in every JSON response, so existing code that
// expects a Prisma-style `record.id` string keeps working without touching every route.
mongoose.set('toJSON', { virtuals: true });

async function connectDB() {
  await mongoose.connect(config.mongodbUri);
  console.log('MongoDB connected');
  return mongoose.connection;
}

module.exports = { connectDB, mongoose };
