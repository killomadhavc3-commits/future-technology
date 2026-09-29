const mongoose = require('mongoose');
const Room = require('../models/Room');
const { findUnavailableRoomIds } = require('../utils/checkAvailability');

const roomFields = ['type', 'price', 'description', 'capacity', 'amenities', 'images'];

const pickRoomFields = (body) =>
  roomFields.reduce((room, field) => {
    if (body[field] !== undefined) {
      room[field] = body[field];
    }
    return room;
  }, {});

const isValidRoomId = (id) => mongoose.Types.ObjectId.isValid(id);

const getPagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 100);

  return { limit, page, skip: (page - 1) * limit };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getDateRange = (from, to) => {
  const checkInDate = new Date(from);
  const checkOutDate = new Date(to);

  if (
    Number.isNaN(checkInDate.getTime()) ||
    Number.isNaN(checkOutDate.getTime()) ||
    checkInDate >= checkOutDate
  ) {
    return null;
  }

  return { checkInDate, checkOutDate };
};

const createRoom = async (req, res) => {
  try {
    const room = await Room.create(pickRoomFields(req.body));

    return res.status(201).json({
      success: true,
      data: room,
      message: 'Room created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to create room',
    });
  }
};

const listRooms = async (req, res) => {
  try {
    const { limit, page, skip } = getPagination(req.query);
    const [rooms, total] = await Promise.all([
      Room.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Room.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: rooms,
      message: 'Rooms retrieved successfully',
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
      message: 'Unable to retrieve rooms',
    });
  }
};

const listAvailableRooms = async (req, res) => {
  const dates = getDateRange(req.query.from, req.query.to);
  if (!dates) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Valid from and to dates are required, and from must be before to',
    });
  }

  try {
    const { limit, page, skip } = getPagination(req.query);
    const unavailableRoomIds = await findUnavailableRoomIds(dates);
    const roomQuery = { _id: { $nin: unavailableRoomIds } };
    const [rooms, total] = await Promise.all([
      Room.find(roomQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Room.countDocuments(roomQuery),
    ]);

    return res.json({
      success: true,
      data: rooms,
      message: 'Available rooms retrieved successfully',
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
      message: 'Unable to retrieve available rooms',
    });
  }
};

const listRoomsByType = async (req, res) => {
  const { limit, page, skip } = getPagination(req.query);
  const type = escapeRegex(req.params.type.trim());
  const roomQuery = { type: { $regex: `^${type}$`, $options: 'i' } };

  try {
    const [rooms, total] = await Promise.all([
      Room.find(roomQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Room.countDocuments(roomQuery),
    ]);

    return res.json({
      success: true,
      data: rooms,
      message: 'Rooms retrieved successfully',
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
      message: 'Unable to retrieve rooms by type',
    });
  }
};

const getRoom = async (req, res) => {
  if (!isValidRoomId(req.params.id)) {
    return res.status(404).json({
      success: false,
      data: null,
      message: 'Room not found',
    });
  }

  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Room not found',
      });
    }

    return res.json({
      success: true,
      data: room,
      message: 'Room retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to retrieve room',
    });
  }
};

const updateRoom = async (req, res) => {
  if (!isValidRoomId(req.params.id)) {
    return res.status(404).json({
      success: false,
      data: null,
      message: 'Room not found',
    });
  }

  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      pickRoomFields(req.body),
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Room not found',
      });
    }

    return res.json({
      success: true,
      data: room,
      message: 'Room updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to update room',
    });
  }
};

const deleteRoom = async (req, res) => {
  if (!isValidRoomId(req.params.id)) {
    return res.status(404).json({
      success: false,
      data: null,
      message: 'Room not found',
    });
  }

  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Room not found',
      });
    }

    return res.json({
      success: true,
      data: room,
      message: 'Room deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Unable to delete room',
    });
  }
};

module.exports = {
  createRoom,
  deleteRoom,
  getRoom,
  listAvailableRooms,
  listRooms,
  listRoomsByType,
  updateRoom,
};
