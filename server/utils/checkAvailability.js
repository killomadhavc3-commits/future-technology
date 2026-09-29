const Booking = require('../models/Booking');

const hasOverlappingBooking = async ({
  roomId,
  checkInDate,
  checkOutDate,
  excludeBookingId,
}) => {
  const query = {
    room: roomId,
    status: { $ne: 'cancelled' },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Boolean(await Booking.exists(query));
};

const findUnavailableRoomIds = async ({ checkInDate, checkOutDate }) =>
  Booking.distinct('room', {
    status: { $ne: 'cancelled' },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  });

module.exports = { findUnavailableRoomIds, hasOverlappingBooking };
