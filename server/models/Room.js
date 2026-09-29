const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
    },
    amenities: [String],
    images: [String],
  },
  { timestamps: true }
);

roomSchema.index({ type: 1 });

module.exports = mongoose.model('Room', roomSchema);
