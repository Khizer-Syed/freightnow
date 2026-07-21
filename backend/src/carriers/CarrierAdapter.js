class CarrierAdapter {
  constructor() {
    if (new.target === CarrierAdapter) {
      throw new Error('CarrierAdapter is abstract');
    }
  }

  get id() { throw new Error('Must implement id'); }
  get name() { throw new Error('Must implement name'); }
  get isLive() { return false; }

  async getRates(params) {
    throw new Error('Must implement getRates()');
  }

  async getTracking(trackingNumber) {
    throw new Error('Must implement getTracking()');
  }

  async bookShipment(details) {
    throw new Error('Must implement bookShipment()');
  }

  // Shared deterministic random number generator (matches frontend algorithm)
  _seededRandom(seed) {
    const rng = ((seed * 9301 + 49297) % 233280) / 233280;
    return rng;
  }

  _seededRandom2(seed) {
    const rng = ((seed * 6271 + 8831) % 233280) / 233280;
    return rng;
  }

  _makeSeed(str) {
    return str.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  }
}

module.exports = CarrierAdapter;
