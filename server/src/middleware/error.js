const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
  let error = err;
  if (error.name === 'ValidationError') {
    const errors = {};
    Object.keys(error.errors).forEach((k) => {
      errors[k] = error.errors[k].message;
    });
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value: ${field} already exists.`
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${error.path}: ${error.value}` });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.isOperational ? error.message : 'Something went wrong on the server.'
  };
  if (error.errors) response.errors = error.errors;
  if (process.env.NODE_ENV !== 'production' && !error.isOperational) {
    response.stack = error.stack;
  }
  if (statusCode >= 500) {
    console.error('✖ Error:', err);
  }
  res.status(statusCode).json(response);
};

module.exports = { notFound, errorHandler };