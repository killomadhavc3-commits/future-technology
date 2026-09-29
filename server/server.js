require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

const port = process.env.PORT || 5001;

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Hotel Room Booking API is healthy' });
});

const start = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured');
  }

  await mongoose.connect(process.env.MONGO_URI);
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
