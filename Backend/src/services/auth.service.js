const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const env = require('../config/env');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      roleId: user.role ? user.role.toString() : null,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

const validateCredentials = ({ email, password }) => {
  if (!email || !EMAIL_REGEX.test(String(email).trim())) {
    throw httpError(400, 'A valid email is required');
  }
  if (!password || String(password).length < 6) {
    throw httpError(400, 'Password must be at least 6 characters');
  }
};

const register = async (payload = {}) => {
  const { companyId, name, email, password, phone, role, department, designation } = payload;

  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw httpError(400, 'A valid companyId is required');
  }
  if (!name || !String(name).trim()) {
    throw httpError(400, 'Name is required');
  }
  validateCredentials({ email, password });

  const normalizedEmail = String(email).toLowerCase().trim();
  const exists = await User.exists({ companyId, email: normalizedEmail });
  if (exists) {
    throw httpError(409, 'Email is already registered for this company');
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);

  try {
    const user = await User.create({
      companyId,
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      role: role || undefined,
      department,
      designation,
    });
    return user.toSafeJSON();
  } catch (err) {
    if (err.code === 11000) {
      throw httpError(409, 'Email is already registered for this company');
    }
    throw err;
  }
};

const login = async ({ companyId, email, password } = {}) => {
  validateCredentials({ email, password });

  // companyId is optional: it is only used to disambiguate when the same
  // email exists under more than one company. Normal login is email + password.
  const query = { email: String(email).toLowerCase().trim() };
  if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
    query.companyId = companyId;
  }

  const user = await User.findOne(query).select('+password');

  if (!user) {
    throw httpError(401, 'Invalid email or password');
  }

  const matches = await bcrypt.compare(String(password), user.password);
  if (!matches) {
    throw httpError(401, 'Invalid email or password');
  }

  if (user.status !== 'active') {
    throw httpError(403, 'Account is inactive. Contact your administrator');
  }

  return { user: user.toSafeJSON(), token: signToken(user) };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw httpError(404, 'User not found');
  }
  return user.toSafeJSON();
};

module.exports = { register, login, getMe };
