const CarrierAdapter = require('./CarrierAdapter');
const { addBusinessDays, formatDate } = require('../utils/dateHelpers');

class PolarisAdapter extends CarrierAdapter {
  get id() { return 'polaris'; }
  get name() { return 'Polaris'; }
  get isLive() { return !!process.env.POLARIS_API_KEY; }

  async getRates(params) {
    return this._getMockRates(params);
  }

  _getMockRates(params) {
    const { shipmentType, origin, destination, weight, freightClass, pickupDate, accessorials = [] } = params;
    const seed = this._makeSeed(this.id + (origin.postalCode || origin.city) + (destination.postalCode || destination.city) + shipmentType);
    const rng = this._seededRandom(seed);
    const rng2 = this._seededRandom2(seed);

    let base;
    if (shipmentType === 'envelope') base = 18 + rng * 35;
    else if (shipmentType === 'parcel') base = 22 + rng * 55 + (weight / 10) * (7 + rng2 * 6);
    else {
      const classMultiplier = this._getClassMultiplier(freightClass);
      base = (55 + rng * 85) * (weight / 100) * classMultiplier;
    }

    base = this._applyAccessorials(base, accessorials, rng2);

    const transitDays = shipmentType === 'envelope' ? Math.ceil(1 + rng2 * 2) : shipmentType === 'parcel' ? Math.ceil(1 + rng2 * 3) : Math.ceil(2 + rng2 * 4);
    const services = { envelope: ['Priority Express', 'Next Day Air', 'Standard'], parcel: ['Ground Advantage', 'Express Select', '2-Day Priority'], ltl: ['Freight Select', 'Freight Standard', 'Economy Freight'] };
    const svcList = services[shipmentType] || services.ltl;
    const serviceName = svcList[Math.floor(rng * svcList.length)];
    const rate = Math.max(Math.round((base + (rng - 0.5) * 8) * 100) / 100, shipmentType === 'envelope' ? 12 : shipmentType === 'parcel' ? 15 : 110);

    const baseDate = pickupDate ? new Date(pickupDate + 'T12:00:00') : new Date();
    const deliveryDate = formatDate(addBusinessDays(baseDate, transitDays));

    return [{ serviceName, rate, transitDays, deliveryDate, isLive: false }];
  }

  _getClassMultiplier(cls) {
    const map = { '50': 1, '55': 1.05, '60': 1.1, '65': 1.15, '70': 1.2, '77.5': 1.3, '85': 1.4, '92.5': 1.5, '100': 1.65, '110': 1.8, '125': 2, '150': 2.3, '175': 2.6, '200': 3, '250': 3.5, '300': 4 };
    return map[String(cls)] || 1;
  }

  _applyAccessorials(base, accessorials, rng2) {
    for (const a of accessorials) {
      if (a === 'liftgate_pickup' || a === 'liftgate_delivery') base += 55 + rng2 * 30;
      if (a === 'residential') base += 22 + rng2 * 12;
      if (a === 'appointment') base += 38 + rng2 * 10;
      if (a === 'inside_delivery') base += 75 + rng2 * 20;
      if (a === 'hazmat') base += 145 + rng2 * 55;
      if (a === 'saturday') base += 32 + rng2 * 15;
      if (a === 'signature') base += 7 + rng2 * 4;
    }
    return base;
  }

  async getTracking(trackingNumber) {
    return { status: 'in_transit', events: [] };
  }

  async bookShipment(details) {
    return { carrierTrackingNumber: `POL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, confirmationNumber: `POL-CONF-${Date.now()}`, status: 'confirmed' };
  }
}

module.exports = new PolarisAdapter();
