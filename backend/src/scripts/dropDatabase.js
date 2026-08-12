const { connectDB, mongoose } = require('../config/database');

async function main() {
  await connectDB();
  await mongoose.connection.dropDatabase();
  console.log('Database dropped.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('Drop database failed:', e);
  process.exit(1);
});
