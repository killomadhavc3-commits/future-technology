const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
      validate: {
        validator(checkOutDate) {
          return !this.checkInDate || checkOutDate > this.checkInDate;
        },
        message: 'Check-out date must be after check-in date',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed',
    },
    totalPrice: {
      type: Number,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1 });
bookingSchema.index({ room: 1 });
bookingSchema.index({ checkInDate: 1 });
bookingSchema.index({ checkOutDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
