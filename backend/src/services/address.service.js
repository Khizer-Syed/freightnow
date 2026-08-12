const Address = require('../models/Address');
const { NotFoundError } = require('../utils/errors');

async function listAddresses(companyId) {
  return Address.find({ company: companyId }).sort({ createdAt: -1 });
}

async function createAddress(companyId, userId, data) {
  return Address.create({
    company: companyId,
    createdBy: userId,
    contactName: data.contactName,
    companyName: data.companyName,
    phone: data.phone,
    street: data.street,
    city: data.city,
    province: data.province,
    postalCode: data.postalCode,
    country: data.country,
    isResidential: data.isResidential || false,
  });
}

async function updateAddress(companyId, addressId, data) {
  const address = await Address.findOneAndUpdate(
    { _id: addressId, company: companyId },
    data,
    { new: true }
  );
  if (!address) throw new NotFoundError('Address');
  return address;
}

async function deleteAddress(companyId, addressId) {
  const result = await Address.deleteOne({ _id: addressId, company: companyId });
  if (result.deletedCount === 0) throw new NotFoundError('Address');
}

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress };
