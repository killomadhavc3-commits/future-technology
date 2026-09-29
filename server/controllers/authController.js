const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return process.env.JWT_SECRET;
};

const createToken = (user) =>
  jwt.sign({ id: user._id.toString() }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const register = async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists',
    });
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
  });

  return res.status(201).json({
    success: true,
    token: createToken(user),
    user: publicUser(user),
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  return res.json({
    success: true,
    token: createToken(user),
    user: publicUser(user),
  });
};

const me = async (req, res) =>
  res.json({
    success: true,
    user: publicUser(req.user),
  });

module.exports = {
  login,
  me,
  register,
};
