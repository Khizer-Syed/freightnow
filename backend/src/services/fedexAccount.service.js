const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const config = require('../config/env');
const { ValidationError, NotFoundError, AuthenticationError } = require('../utils/errors');

const PIN_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const LOCKOUT_HOURS = 24;
const INVOICE_MAX_AGE_DAYS = 90;
const LOCKED_MESSAGE = 'We are unable to process this request. Please try again later or call FedEx Customer Service and ask for technical support.';

async function startConnection(userId, { fedexAccountNumber, address, eulaAccepted }) {
  if (!eulaAccepted) {
    throw new ValidationError('You must accept the FedEx EULA before connecting a FedEx account.');
  }

  const connection = await prisma.fedexAccountConnection.create({
    data: {
      userId,
      fedexAccountNumber,
      shippingAddress: JSON.stringify(address),
      eulaAcceptedAt: new Date(),
      status: 'awaiting_factor2',
    },
  });

  return sanitize(connection);
}

async function startFactor2(userId, connectionId, method) {
  const connection = await getOwnedConnection(userId, connectionId);
  assertNotLocked(connection);

  if (method === 'invoice') {
    const updated = await prisma.fedexAccountConnection.update({
      where: { id: connectionId },
      data: { factor2Method: method },
    });
    return sanitize(updated);
  }

  // pin_email | pin_sms | pin_call
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const pinCodeHash = await bcrypt.hash(code, config.bcryptRounds);
  const pinExpiresAt = new Date(Date.now() + PIN_EXPIRY_MINUTES * 60 * 1000);

  console.log(`[DEV FEDEX PIN] connection ${connectionId} via ${method}: ${code} (expires in ${PIN_EXPIRY_MINUTES} min)`);

  const updated = await prisma.fedexAccountConnection.update({
    where: { id: connectionId },
    data: { factor2Method: method, pinCodeHash, pinExpiresAt, attempts: 0 },
  });

  return sanitize(updated);
}

async function verifyPin(userId, connectionId, code) {
  const connection = await getOwnedConnection(userId, connectionId);
  assertNotLocked(connection);

  if (!connection.pinCodeHash || !connection.pinExpiresAt || connection.pinExpiresAt < new Date()) {
    throw new AuthenticationError('This code has expired. Please request a new one.');
  }

  const valid = await bcrypt.compare(code, connection.pinCodeHash);
  if (!valid) {
    return recordFailedAttempt(connection, "That code didn't match.");
  }

  return finalizeVerification(connection);
}

async function verifyInvoice(userId, connectionId, { invoiceNumber, invoiceDate, amount, currency }) {
  const connection = await getOwnedConnection(userId, connectionId);
  assertNotLocked(connection);

  const ageMs = Date.now() - new Date(invoiceDate).getTime();
  const isValid = invoiceNumber?.trim() && amount > 0 && currency?.trim()
    && ageMs >= 0 && ageMs <= INVOICE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  if (!isValid) {
    return recordFailedAttempt(connection, "Invoice doesn't exist for the provided details.");
  }

  return finalizeVerification(connection);
}

async function listConnections(userId) {
  const connections = await prisma.fedexAccountConnection.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return connections.map(sanitize);
}

async function disconnect(userId, connectionId) {
  await getOwnedConnection(userId, connectionId);
  await prisma.fedexAccountConnection.delete({ where: { id: connectionId } });
}

async function getOwnedConnection(userId, connectionId) {
  const connection = await prisma.fedexAccountConnection.findFirst({ where: { id: connectionId, userId } });
  if (!connection) throw new NotFoundError('FedEx account connection');
  return connection;
}

function assertNotLocked(connection) {
  if (connection.status === 'locked' && connection.lockedUntil && connection.lockedUntil > new Date()) {
    throw new AuthenticationError(LOCKED_MESSAGE);
  }
}

async function recordFailedAttempt(connection, reasonMessage) {
  const attempts = connection.attempts + 1;

  if (attempts >= MAX_ATTEMPTS) {
    const locked = await prisma.fedexAccountConnection.update({
      where: { id: connection.id },
      data: { attempts, status: 'locked', lockedUntil: new Date(Date.now() + LOCKOUT_HOURS * 60 * 60 * 1000) },
    });
    const err = new AuthenticationError(LOCKED_MESSAGE);
    err.details = { connection: sanitize(locked) };
    throw err;
  }

  const updated = await prisma.fedexAccountConnection.update({
    where: { id: connection.id },
    data: { attempts },
  });
  const err = new AuthenticationError(`${reasonMessage} ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
  err.details = { connection: sanitize(updated) };
  throw err;
}

async function finalizeVerification(connection) {
  const childKey = `child_${crypto.randomBytes(12).toString('hex')}`;
  const childSecret = crypto.randomBytes(24).toString('hex');

  const updated = await prisma.fedexAccountConnection.update({
    where: { id: connection.id },
    data: {
      status: 'verified',
      verifiedAt: new Date(),
      childKey,
      childSecret,
      pinCodeHash: null,
      pinExpiresAt: null,
    },
  });

  return sanitize(updated);
}

function sanitize(connection) {
  const { pinCodeHash, childSecret, ...rest } = connection;
  return { ...rest, shippingAddress: JSON.parse(rest.shippingAddress), hasChildSecret: !!childSecret };
}

module.exports = { startConnection, startFactor2, verifyPin, verifyInvoice, listConnections, disconnect };
