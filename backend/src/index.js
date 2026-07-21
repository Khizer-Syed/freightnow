const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const { getAllCarriers } = require('./carriers');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const carriers = {};
  for (const carrier of getAllCarriers()) {
    carriers[carrier.id] = true;
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    carriers,
  });
});

// API routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`IFF Cargo backend running on port ${config.port}`);
});

module.exports = app;
