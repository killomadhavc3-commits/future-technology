const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('express-validator');
const roomController = require('../controllers/roomController');
const adminMiddleware = require('../middleware/adminMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: errors.array()[0].msg,
    });
  }

  return next();
};

const createRoomValidation = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Room type is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
];

const updateRoomValidation = [
  body('type')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Room type cannot be empty'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
];

const availabilityValidation = [
  query('from').isISO8601().withMessage('A valid from date is required'),
  query('to').isISO8601().withMessage('A valid to date is required'),
];

router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  createRoomValidation,
  handleValidationErrors,
  asyncHandler(roomController.createRoom)
);
router.get('/', asyncHandler(roomController.listRooms));
router.get(
  '/available',
  availabilityValidation,
  handleValidationErrors,
  asyncHandler(roomController.listAvailableRooms)
);
router.get('/type/:type', asyncHandler(roomController.listRoomsByType));
router.get('/:id', asyncHandler(roomController.getRoom));
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  updateRoomValidation,
  handleValidationErrors,
  asyncHandler(roomController.updateRoom)
);
router.delete('/:id', authMiddleware, adminMiddleware, asyncHandler(roomController.deleteRoom));

module.exports = router;
