const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config/env');
const { AuthenticationError, ConflictError, NotFoundError } = require('../utils/errors');

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

  const token = generateToken(user);
  return { user: sanitizeUser(user), token };
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

module.exports = { register, login, changePassword, getMe };
