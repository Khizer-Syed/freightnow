const fedex = require('./fedex.adapter');
const xpo = require('./xpo.adapter');
const dayross = require('./dayross.adapter');
const manitoulin = require('./manitoulin.adapter');
const polaris = require('./polaris.adapter');

const carriers = { fedex, xpo, dayross, manitoulin, polaris };

module.exports = {
  carriers,
  getAllCarriers: () => Object.values(carriers),
  getCarrier: (id) => carriers[id] || null,
};
