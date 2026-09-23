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

const signToken = (user) => {
  if (!user.companyId) {
    throw httpError(
      403,
      'Your account is not linked to a company'
    );
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      roleId: user.role ? user.role.toString() : null,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};

const validateCredentials = ({ email, password }) => {
  if (!email || !EMAIL_REGEX.test(String(email).trim())) {
    throw httpError(400, 'A valid email is required');
  }

  if (!password || String(password).length < 6) {
    throw httpError(
      400,
      'Password must be at least 6 characters'
    );
  }
};

const register = async (payload = {}) => {
  const {
    companyId,
    name,
    email,
    password,
    phone,
    role,
    department,
    designation,
  } = payload;

  if (!companyId) {
    throw httpError(400, 'A companyId is required');
  }

  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    throw httpError(400, 'Invalid companyId');
  }

  if (!name || !String(name).trim()) {
    throw httpError(400, 'Name is required');
  }

  validateCredentials({
    email,
    password,
  });

  const normalizedCompanyId = new mongoose.Types.ObjectId(
    companyId
  );

  const normalizedEmail = String(email)
    .toLowerCase()
    .trim();

  const exists = await User.exists({
    companyId: normalizedCompanyId,
    email: normalizedEmail,
  });

  if (exists) {
    throw httpError(
      409,
      'Email is already registered for this company'
    );
  }

  const hashedPassword = await bcrypt.hash(
    String(password),
    10
  );

  try {
    const user = await User.create({
      companyId: normalizedCompanyId,
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone ? String(phone).trim() : undefined,
      role: role || undefined,
      department: department
        ? String(department).trim()
        : undefined,
      designation: designation
        ? String(designation).trim()
        : undefined,
    });

    return user.toSafeJSON();
  } catch (err) {
    if (err.code === 11000) {
      throw httpError(
        409,
        'Email is already registered for this company'
      );
    }

    throw err;
  }
};

const login = async ({
  companyId,
  email,
  password,
} = {}) => {
  validateCredentials({
    email,
    password,
  });

  const normalizedEmail = String(email)
    .toLowerCase()
    .trim();

  const query = {
    email: normalizedEmail,
  };

  if (companyId) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw httpError(400, 'Invalid companyId');
    }

    query.companyId = companyId;
  }

  const user = await User.findOne(query)
    .select('+password');

  if (!user) {
    throw httpError(
      401,
      'Invalid email or password'
    );
  }

  const matches = await bcrypt.compare(
    String(password),
    user.password
  );

  if (!matches) {
    throw httpError(
      401,
      'Invalid email or password'
    );
  }

  if (user.status !== 'active') {
    throw httpError(
      403,
      'Account is inactive. Contact your administrator'
    );
  }

  // Every ERP user must belong to a company.
  if (!user.companyId) {
    throw httpError(
      403,
      'Your account is not linked to a company'
    );
  }

  const token = signToken(user);

  return {
    user: user.toSafeJSON(),
    token,
  };
};

const getMe = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw httpError(400, 'Invalid user ID');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw httpError(404, 'User not found');
  }

  if (!user.companyId) {
    throw httpError(
      403,
      'Your account is not linked to a company'
    );
  }

  return user.toSafeJSON();
};

module.exports = {
  register,
  login,
  getMe,
};