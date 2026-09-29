process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');

let mongoServer;

const registerUser = async (overrides = {}) => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Guest',
      email: `guest-${Date.now()}@example.com`,
      password: 'password123',
      ...overrides,
    });

  return response.body.token;
};

describe('Hotel Room Booking API', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    await Promise.all([
      Booking.deleteMany({}),
      Room.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('authentication', () => {
    test('registers and logs in without returning the password', async () => {
      const credentials = {
        name: 'Ada Guest',
        email: 'ada@example.com',
        password: 'password123',
      };
      const registration = await request(app).post('/api/auth/register').send(credentials);

      expect(registration.status).toBe(201);
      expect(registration.body.success).toBe(true);
      expect(registration.body.token).toEqual(expect.any(String));
      expect(registration.body.user.password).toBeUndefined();

      const login = await request(app).post('/api/auth/login').send(credentials);
      expect(login.status).toBe(200);
      expect(login.body.token).toEqual(expect.any(String));
    });
  });

  describe('availability', () => {
    test('excludes rooms with overlapping non-cancelled bookings', async () => {
      const room = await Room.create({ type: 'Suite', price: 200 });
      await Booking.create({
        user: new mongoose.Types.ObjectId(),
        room: room._id,
        checkInDate: new Date('2030-06-10'),
        checkOutDate: new Date('2030-06-15'),
        status: 'confirmed',
      });
      const availableRoom = await Room.create({ type: 'Double', price: 120 });

      const response = await request(app)
        .get('/api/rooms/available?from=2030-06-12&to=2030-06-14');

      expect(response.status).toBe(200);
      expect(response.body.data.map(({ _id }) => _id)).not.toContain(room._id.toString());
      expect(response.body.data.map(({ _id }) => _id)).toContain(availableRoom._id.toString());
    });
  });

  describe('admin room management', () => {
    test('blocks guests and allows admins to create rooms', async () => {
      const guestToken = await registerUser({ email: 'guest-room@example.com' });
      const adminEmail = 'admin-room@example.com';
      const adminToken = await registerUser({ email: adminEmail });
      await User.updateOne({ email: adminEmail }, { role: 'admin' });

      const room = { type: 'Double', price: 150, capacity: 2 };
      const guestResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(room);
      const adminResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(room);

      expect(guestResponse.status).toBe(403);
      expect(adminResponse.status).toBe(201);
    });
  });

  describe('booking overlap protection', () => {
    test('rejects a second booking for overlapping dates', async () => {
      const token = await registerUser();
      const room = await Room.create({ type: 'Single', price: 100 });
      const booking = {
        room: room._id.toString(),
        checkInDate: '2030-07-10',
        checkOutDate: '2030-07-14',
      };

      const first = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send(booking);
      const second = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...booking, checkInDate: '2030-07-13', checkOutDate: '2030-07-16' });

      expect(first.status).toBe(201);
      expect(first.body.data.totalPrice).toBe(400);
      expect(second.status).toBe(409);
      expect(second.body).toMatchObject({ success: false });
    });
  });

  describe('booking ownership and cancellation', () => {
    test('scopes my bookings and cancels without deleting the record', async () => {
      const ownerToken = await registerUser({ email: 'owner@example.com' });
      const otherToken = await registerUser({ email: 'other@example.com' });
      const room = await Room.create({ type: 'Suite', price: 180 });
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          room: room._id.toString(),
          checkInDate: '2030-08-10',
          checkOutDate: '2030-08-12',
        });
      const bookingId = bookingResponse.body.data._id;

      const mine = await request(app)
        .get('/api/bookings/mine')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(mine.status).toBe(200);
      expect(mine.body.data).toHaveLength(0);

      const cancel = await request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`);
      const storedBooking = await Booking.findById(bookingId);

      expect(cancel.status).toBe(200);
      expect(cancel.body.data.status).toBe('cancelled');
      expect(storedBooking).not.toBeNull();
      expect(storedBooking.status).toBe('cancelled');
    });
  });

  describe('pagination', () => {
    test('returns pagination metadata for rooms and admin bookings', async () => {
      const adminEmail = 'admin-pagination@example.com';
      const adminToken = await registerUser({ email: adminEmail });
      await User.updateOne({ email: adminEmail }, { role: 'admin' });
      await Room.create([
        { type: 'Single', price: 90 },
        { type: 'Double', price: 120 },
        { type: 'Suite', price: 220 },
      ]);

      const rooms = await request(app).get('/api/rooms?page=1&limit=2');
      const bookings = await request(app)
        .get('/api/bookings?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(rooms.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
      expect(rooms.body.data).toHaveLength(2);
      expect(bookings.status).toBe(200);
      expect(bookings.body.pagination).toMatchObject({ page: 1, limit: 2, total: 0, totalPages: 0 });
    });
  });
});
