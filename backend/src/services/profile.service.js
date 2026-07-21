const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true, notifications: true },
  });
  if (!user) throw new NotFoundError('User');

  const { passwordHash, ...profile } = user;
  return profile;
}

async function updateProfile(userId, data) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    },
  });
  const { passwordHash, ...profile } = user;
  return profile;
}

async function updateCompany(userId, data) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } });
  if (!user) throw new NotFoundError('User');

  if (user.companyId) {
    return prisma.company.update({
      where: { id: user.companyId },
      data: {
        name: data.name,
        country: data.country,
        province: data.province,
        city: data.city,
        postalCode: data.postalCode,
      },
    });
  } else {
    const company = await prisma.company.create({
      data: {
        name: data.name,
        country: data.country,
        province: data.province,
        city: data.city,
        postalCode: data.postalCode,
      },
    });
    await prisma.user.update({ where: { id: userId }, data: { companyId: company.id } });
    return company;
  }
}

async function updateNotifications(userId, data) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

async function deleteAccount(userId) {
  // Delete related records
  await prisma.quoteRate.deleteMany({ where: { quote: { userId } } });
  await prisma.trackingEvent.deleteMany({ where: { shipment: { userId } } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { userId } } });
  await prisma.quote.deleteMany({ where: { userId } });
  await prisma.shipment.deleteMany({ where: { userId } });
  await prisma.claim.deleteMany({ where: { userId } });
  await prisma.paymentMethod.deleteMany({ where: { userId } });
  await prisma.invoice.deleteMany({ where: { userId } });
  await prisma.spotRateRequest.deleteMany({ where: { userId } });
  await prisma.notificationPreference.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

module.exports = { getProfile, updateProfile, updateCompany, updateNotifications, deleteAccount };
