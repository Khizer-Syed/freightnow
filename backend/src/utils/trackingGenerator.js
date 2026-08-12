const prisma = require('../config/database');

async function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.shipment.count();
  const seq = String(count + 1).padStart(5, '0');
  return `IFF-${year}-${seq}`;
}

async function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.quote.count();
  const seq = String(count + 1).padStart(4, '0');
  return `Q-${year}-${seq}`;
}

async function generateBookingNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.booking.count();
  const seq = String(count + 1).padStart(4, '0');
  return `BK-${year}-${seq}`;
}

async function generateClaimNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.claim.count();
  const seq = String(count + 1).padStart(4, '0');
  return `CLM-${year}-${seq}`;
}

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  const seq = String(count + 1).padStart(4, '0');
  return `INV-${year}-${seq}`;
}

async function generateSpotRateNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.spotRateRequest.count();
  const seq = String(count + 1).padStart(4, '0');
  return `SPR-${year}-${seq}`;
}

module.exports = { generateTrackingNumber, generateQuoteNumber, generateBookingNumber, generateClaimNumber, generateInvoiceNumber, generateSpotRateNumber };
