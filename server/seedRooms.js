require('dotenv').config();

const mongoose = require('mongoose');
const Room = require('./models/Room');

const rooms = [
  {
    type: 'Single',
    price: 85,
    capacity: 1,
    description: 'A calm, compact room for solo stays and easy mornings.',
    amenities: ['Wi-Fi', 'Workspace', 'Breakfast'],
  },
  {
    type: 'Double',
    price: 125,
    capacity: 2,
    description: 'A comfortable room with space to settle in and slow down.',
    amenities: ['Wi-Fi', 'King bed', 'Breakfast'],
  },
  {
    type: 'Suite',
    price: 200,
    capacity: 3,
    description: 'A generous suite for longer stays, shared plans, and quiet evenings.',
    amenities: ['Wi-Fi', 'Living area', 'Breakfast', 'City view'],
  },
];

const seedRooms = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const existingCount = await Room.countDocuments();

  if (existingCount === 0) {
    await Room.insertMany(rooms);
    console.log(`Added ${rooms.length} sample rooms.`);
  } else {
    console.log(`Skipped seeding: ${existingCount} room(s) already exist.`);
  }

  await mongoose.disconnect();
};

seedRooms().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
