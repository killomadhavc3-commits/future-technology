const express = require('express');
const { body, validationResult } = require('express-validator');
const bookingController = require('../controllers/bookingController');
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

const createBookingValidation = [
  body('room').isMongoId().withMessage('A valid room id is required'),
  body('checkInDate').isISO8601().withMessage('A valid check-in date is required'),
  body('checkOutDate').isISO8601().withMessage('A valid check-out date is required'),
];

const updateBookingValidation = [
  body('checkInDate').optional().isISO8601().withMessage('A valid check-in date is required'),
  body('checkOutDate').optional().isISO8601().withMessage('A valid check-out date is required'),
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled'])
    .withMessage('Invalid booking status'),
];

router.post(
  '/',
  authMiddleware,
  createBookingValidation,
  handleValidationErrors,
  asyncHandler(bookingController.createBooking)
);
router.get('/', authMiddleware, adminMiddleware, asyncHandler(bookingController.listBookings));
router.get('/mine', authMiddleware, asyncHandler(bookingController.listMyBookings));
router.patch('/:id/cancel', authMiddleware, asyncHandler(bookingController.cancelBooking));
router.get('/:id', authMiddleware, asyncHandler(bookingController.getBooking));
router.put(
  '/:id',
  authMiddleware,
  updateBookingValidation,
  handleValidationErrors,
  asyncHandler(bookingController.updateBooking)
);
router.delete('/:id', authMiddleware, asyncHandler(bookingController.deleteBooking));

module.exports = router;
