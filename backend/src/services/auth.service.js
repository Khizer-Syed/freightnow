const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config/env');
const emailService = require('./email.service');
const { AuthenticationError, ConflictError, NotFoundError } = require('../utils/errors');

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PURPOSE = 'login-2fa';

async function register({ firstName, lastName, email, phone, password, company }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      company: company ? {
        create: {
          name: company.name,
          country: company.country,
          province: company.province,
          city: company.city,
          postalCode: company.postalCode,
          shippingType: company.shippingType,
        },
      } : undefined,
      notifications: {
        create: {},
      },
    },
    include: { company: true },
  });

  const token = generateToken(user);
  return { user: sanitizeUser(user), token };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email }, include: { company: true } });
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

  const otp = await prisma.twoFactorCode.findFirst({
    where: { userId: user.id, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp || otp.expiresAt < new Date()) {
    throw new AuthenticationError('This code has expired. Please request a new one.');
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AuthenticationError('Too many attempts. Please request a new code.');
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    const attempts = otp.attempts + 1;
    await prisma.twoFactorCode.update({ where: { id: otp.id }, data: { attempts } });
    throw new AuthenticationError(`That code didn't match. ${OTP_MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
  }

  await prisma.twoFactorCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  const token = generateToken(user);
  return { user: sanitizeUser(user), token };
}

async function resendLoginOtp({ pendingToken }) {
  const user = await getUserFromPendingToken(pendingToken);
  await issueAndSendOtp(user);
}

async function issueAndSendOtp(user) {
  await prisma.twoFactorCode.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, config.bcryptRounds);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.twoFactorCode.create({ data: { userId: user.id, codeHash, expiresAt } });
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

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { company: true } });
  if (!user) throw new NotFoundError('User');
  return user;
}

function generatePendingToken(user) {
  return jwt.sign({ sub: user.id, purpose: OTP_PURPOSE }, config.jwtSecret, { expiresIn: `${OTP_EXPIRY_MINUTES}m` });
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true, notifications: true },
  });
  if (!user) throw new NotFoundError('User');
  return sanitizeUser(user);
}

function generateToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = { register, login, verifyLoginOtp, resendLoginOtp, changePassword, getMe };
