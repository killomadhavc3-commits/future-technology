const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'Internal server error';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map(({ message: detail }) => detail).join(', ');
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  if (statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
