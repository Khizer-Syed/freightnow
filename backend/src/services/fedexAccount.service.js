const crypto = require('crypto');
const bcrypt = require('bcrypt');
const FedexAccountConnection = require('../models/FedexAccountConnection');
const config = require('../config/env');
const activityLogService = require('./activityLog.service');
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

  const connection = await FedexAccountConnection.create({
    user: userId,
    fedexAccountNumber,
    shippingAddress: address,
    eulaAcceptedAt: new Date(),
    status: 'awaiting_factor2',
  });

  activityLogService.logActivity(userId, null, 'fedex_eula_accepted', { connectionId: connection.id });

  return sanitize(connection);
}

async function startFactor2(userId, connectionId, method) {
  const connection = await getOwnedConnection(userId, connectionId);
  assertNotLocked(connection);

  if (method === 'invoice') {
    connection.factor2Method = method;
    await connection.save();
    return sanitize(connection);
  }

  // pin_email | pin_sms | pin_call
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const pinCodeHash = await bcrypt.hash(code, config.bcryptRounds);
  const pinExpiresAt = new Date(Date.now() + PIN_EXPIRY_MINUTES * 60 * 1000);

  console.log(`[DEV FEDEX PIN] connection ${connectionId} via ${method}: ${code} (expires in ${PIN_EXPIRY_MINUTES} min)`);

  connection.factor2Method = method;
  connection.pinCodeHash = pinCodeHash;
  connection.pinExpiresAt = pinExpiresAt;
  connection.attempts = 0;
  await connection.save();

  return sanitize(connection);
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
  const connections = await FedexAccountConnection.find({ user: userId }).sort({ createdAt: -1 });
  return connections.map(sanitize);
}

async function disconnect(userId, connectionId) {
  const connection = await getOwnedConnection(userId, connectionId);
  await FedexAccountConnection.deleteOne({ _id: connection._id });
}

async function getOwnedConnection(userId, connectionId) {
  const connection = await FedexAccountConnection.findOne({ _id: connectionId, user: userId });
  if (!connection) throw new NotFoundError('FedEx account connection');
  return connection;
}

function assertNotLocked(connection) {
  if (connection.status === 'locked' && connection.lockedUntil && connection.lockedUntil > new Date()) {
    throw new AuthenticationError(LOCKED_MESSAGE);
  }
}

async function recordFailedAttempt(connection, reasonMessage) {
  connection.attempts += 1;

  if (connection.attempts >= MAX_ATTEMPTS) {
    connection.status = 'locked';
    connection.lockedUntil = new Date(Date.now() + LOCKOUT_HOURS * 60 * 60 * 1000);
    await connection.save();
    const err = new AuthenticationError(LOCKED_MESSAGE);
    err.details = { connection: sanitize(connection) };
    throw err;
  }

  await connection.save();
  const err = new AuthenticationError(`${reasonMessage} ${MAX_ATTEMPTS - connection.attempts} attempt(s) remaining.`);
  err.details = { connection: sanitize(connection) };
  throw err;
}

async function finalizeVerification(connection) {
  connection.status = 'verified';
  connection.verifiedAt = new Date();
  connection.childKey = `child_${crypto.randomBytes(12).toString('hex')}`;
  connection.childSecret = crypto.randomBytes(24).toString('hex');
  connection.pinCodeHash = null;
  connection.pinExpiresAt = null;
  await connection.save();

  return sanitize(connection);
}

function sanitize(connection) {
  const obj = connection.toObject({ virtuals: true });
  const { pinCodeHash, childSecret, ...rest } = obj;
  return { ...rest, hasChildSecret: !!childSecret };
}

module.exports = { startConnection, startFactor2, verifyPin, verifyInvoice, listConnections, disconnect };
