const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { hasOverlappingBooking } = require('../utils/checkAvailability');

const bookingFields = ['checkInDate', 'checkOutDate', 'status'];

const isValidBookingId = (id) => mongoose.Types.ObjectId.isValid(id);

const getPagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 100);

  return { limit, page, skip: (page - 1) * limit };
};

const getNights = (checkInDate, checkOutDate) =>
  Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

const getBookingDates = (checkInDate, checkOutDate) => {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }

  return { checkInDate: start, checkOutDate: end };
};

const canAccessBooking = (booking, user) =>
  user.role === 'admin' ||
  (booking.user._id || booking.user).toString() === user._id.toString();

const pickUpdateFields = (body) =>
  bookingFields.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }
    return fields;
  }, {});

const createBooking = async (req, res) => {
  const dates = getBookingDates(req.body.checkInDate, req.body.checkOutDate);
  if (!dates) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Check-out date must be after check-in date',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(req.body.room)) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'A valid room id is required',
    });
  }

  try {
    const room = await Room.findById(req.body.room);
    if (!room) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Room not found',
      });
    }

    if (await hasOverlappingBooking({ roomId: room._id, ...dates })) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'Room is already booked for the selected dates',
      });
    }

    const booking = await Booking.create({
      user: req.user._id,
      room: room._id,
      ...dates,
      totalPrice: room.price * getNights(dates.checkInDate, dates.checkOutDate),
    });

    await booking.populate('user room');
    return res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to create booking',
    });
  }
};

const listBookings = async (req, res) => {
  try {
    const { limit, page, skip } = getPagination(req.query);
    const [bookings, total] = await Promise.all([
      Booking.find().populate('user room').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Booking.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: bookings,
      message: 'Bookings retrieved successfully',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to retrieve bookings',
    });
  }
};

const listMyBookings = async (req, res) => {
  try {
    const { limit, page, skip } = getPagination(req.query);
    const query = { user: req.user._id };
    const [bookings, total] = await Promise.all([
      Booking.find(query).populate('room').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Booking.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: bookings,
      message: 'Your bookings retrieved successfully',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to retrieve your bookings',
    });
  }
};

const getBooking = async (req, res) => {
  if (!isValidBookingId(req.params.id)) {
    return res.status(404).json({ success: false, data: null, message: 'Booking not found' });
  }

  try {
    const booking = await Booking.findById(req.params.id).populate('user room');
    if (!booking) {
      return res.status(404).json({ success: false, data: null, message: 'Booking not found' });
    }

    if (!canAccessBooking(booking, req.user)) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied' });
    }

    return res.json({
      success: true,
      data: booking,
      message: 'Booking retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to retrieve booking',
    });
  }
};

const updateBooking = async (req, res) => {
  if (!isValidBookingId(req.params.id)) {
    return res.status(404).json({ success: false, data: null, message: 'Booking not found' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, data: null, message: 'Booking not found' });
    }

    if (!canAccessBooking(booking, req.user)) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied' });
    }

    const updates = pickUpdateFields(req.body);
    const dates = getBookingDates(
      updates.checkInDate || booking.checkInDate,
      updates.checkOutDate || booking.checkOutDate
    );

    if (!dates) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Check-out date must be after check-in date',
      });
    }

    const datesChanged = updates.checkInDate !== undefined || updates.checkOutDate !== undefined;
    if (datesChanged && await hasOverlappingBooking({
      roomId: booking.room,
      ...dates,
      excludeBookingId: booking._id,
    })) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'Room is already booked for the selected dates',
      });
    }

    Object.assign(booking, updates, dates);
    if (datesChanged) {
      const room = await Room.findById(booking.room);
      booking.totalPrice = room.price * getNights(dates.checkInDate, dates.checkOutDate);
    }
    await booking.save();
    await booking.populate('user room');

    return res.json({
      success: true,
      data: booking,
      message: 'Booking updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to update booking',
    });
  }
};

const deleteBooking = async (req, res) => {
  if (!isValidBookingId(req.params.id)) {
    return res.status(404).json({ success: false, data: null, message: 'Booking not found' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, data: null, message: 'Booking not found' });
    }

    if (!canAccessBooking(booking, req.user)) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied' });
    }

    await booking.deleteOne();
    return res.json({
      success: true,
      data: booking,
      message: 'Booking deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to delete booking',
    });
  }
};

const cancelBooking = async (req, res) => {
  if (!isValidBookingId(req.params.id)) {
    return res.status(404).json({ success: false, data: null, message: 'Booking not found' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, data: null, message: 'Booking not found' });
    }

    if (!canAccessBooking(booking, req.user)) {
      return res.status(403).json({ success: false, data: null, message: 'Access denied' });
    }

    booking.status = 'cancelled';
    await booking.save();
    await booking.populate('user room');

    return res.json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to cancel booking',
    });
  }
};

module.exports = {
  cancelBooking,
  createBooking,
  deleteBooking,
  getBooking,
  listMyBookings,
  listBookings,
  updateBooking,
};
