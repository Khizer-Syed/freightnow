const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const TwoFactorCode = require('../models/TwoFactorCode');
const config = require('../config/env');
const emailService = require('./email.service');
const activityLogService = require('./activityLog.service');
const { AuthenticationError, ConflictError, NotFoundError } = require('../utils/errors');

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PURPOSE = 'login-2fa';

async function register({ firstName, lastName, email, phone, password, company }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  let companyDoc = null;
  if (company) {
    companyDoc = await Company.create({
      name: company.name,
      country: company.country,
      province: company.province,
      city: company.city,
      postalCode: company.postalCode,
      shippingType: company.shippingType,
    });
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    passwordHash,
    company: companyDoc ? companyDoc._id : undefined,
  });
  if (companyDoc) await user.populate('company');

  const token = generateToken(user);
  return { user: sanitizeUser(user), token };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).populate('company');
  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Invalid email or password');
  }

  await issueAndSendOtp(user);
  const pendingToken = generatePendingToken(user);
  return { twoFactorRequired: true, pendingToken };
}

async function verifyLoginOtp({ pendingToken, code }) {
  const user = await getUserFromPendingToken(pendingToken);

  const otp = await TwoFactorCode.findOne({ user: user._id, consumedAt: null }).sort({ createdAt: -1 });

  if (!otp || otp.expiresAt < new Date()) {
    throw new AuthenticationError('This code has expired. Please request a new one.');
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AuthenticationError('Too many attempts. Please request a new code.');
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    otp.attempts += 1;
    await otp.save();
    throw new AuthenticationError(`That code didn't match. ${OTP_MAX_ATTEMPTS - otp.attempts} attempt(s) remaining.`);
  }

  otp.consumedAt = new Date();
  await otp.save();

  const token = generateToken(user);
  activityLogService.logActivity(user._id, user.company?._id || user.company, 'login', {});
  return { user: sanitizeUser(user), token };
}

async function resendLoginOtp({ pendingToken }) {
  const user = await getUserFromPendingToken(pendingToken);
  await issueAndSendOtp(user);
}

async function issueAndSendOtp(user) {
  await TwoFactorCode.updateMany({ user: user._id, consumedAt: null }, { consumedAt: new Date() });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, config.bcryptRounds);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await TwoFactorCode.create({ user: user._id, codeHash, expiresAt });
  emailService.sendOtpEmail(user, code);
}

async function getUserFromPendingToken(pendingToken) {
  let payload;
  try {
    payload = jwt.verify(pendingToken, config.jwtSecret);
  } catch {
    throw new AuthenticationError('Invalid or expired session. Please log in again.');
  }
  if (payload.purpose !== OTP_PURPOSE) {
    throw new AuthenticationError('Invalid or expired session. Please log in again.');
  }

  const user = await User.findById(payload.sub).populate('company');
  if (!user) throw new NotFoundError('User');
  return user;
}

function generatePendingToken(user) {
  return jwt.sign({ sub: user.id, purpose: OTP_PURPOSE }, config.jwtSecret, { expiresIn: `${OTP_EXPIRY_MINUTES}m` });
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await user.save();
}

async function getMe(userId) {
  const user = await User.findById(userId).populate('company');
  if (!user) throw new NotFoundError('User');
  return sanitizeUser(user);
}

function generateToken(user) {
  const companyId = user.company ? (user.company._id || user.company).toString() : null;
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, companyId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function sanitizeUser(user) {
  const obj = user.toObject({ virtuals: true });
  delete obj.passwordHash;
  return obj;
}

module.exports = { register, login, verifyLoginOtp, resendLoginOtp, changePassword, getMe };
