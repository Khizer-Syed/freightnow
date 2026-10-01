const https = require('https');
const zlib = require('zlib');

// XPO LTL has no separate sandbox: its guides list only production endpoints and say to test
// against them. Rating and tracking are read-only, so this is safe; no BOL/pickup call exists here.
const AUTH_URL = 'https://api.xpo.com/token';
const RATE_URL = 'https://api.ltl.xpo.com/rating/1.0/ratequotes';
const TRACKING_BASE = 'https://api.ltl.xpo.com/tracking/1.0';

// Auth is an OAuth2 "password" grant: the Basic header carries the consumer key/secret
// (XPO_AUTH_KEY, already base64), the body carries the XPO LTL portal user. Rates are priced
// against XPO_BILL_ACCOUNT, which must be a Bill-To account linked to that user's profile.
// (XPO_PD_ACCOUNT is a pickup/delivery location account; XPO rejects it as a bill-to party.)
function isConfigured() {
  return !!(process.env.XPO_AUTH_KEY && process.env.XPO_USERNAME && process.env.XPO_PASSWORD
    && process.env.XPO_BILL_ACCOUNT);
}

const REQUEST_TIMEOUT_MS = 20000;

function _request(method, url, headers, rawBody) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyBuf = rawBody ? Buffer.from(rawBody) : null;
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'User-Agent': 'IFFCargo/1.0',
        'Accept-Encoding': 'gzip, deflate, identity',
        Accept: 'application/json',
        ...headers,
        ...(bodyBuf && { 'Content-Length': bodyBuf.length }),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const encoding = res.headers['content-encoding'];

        function handleBody(text) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(text)); } catch { resolve(text); }
          } else {
            console.error(`[XPO-HTTP] ${method} ${url} failed: ${res.statusCode}`, text.substring(0, 500));
            let parsed = text;
            try { parsed = JSON.parse(text); } catch { /* keep raw text */ }
            // XPO puts the useful reason in error.message, often with a trailing "|".
            const reason = parsed?.error?.message?.replace(/\|$/, '') || '';
            const err = new Error(`XPO API error (${res.statusCode})${reason ? `: ${reason}` : ''}`);
            err.statusCode = res.statusCode;
            err.body = parsed;
            reject(err);
          }
        }

        if (encoding === 'gzip') zlib.gunzip(buf, (e, d) => e ? reject(e) : handleBody(d.toString()));
        else if (encoding === 'deflate') zlib.inflate(buf, (e, d) => e ? reject(e) : handleBody(d.toString()));
        else handleBody(buf.toString());
      });
    });

    req.on('error', reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`XPO API request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Bearer token — cached until shortly before expires_in
// ---------------------------------------------------------------------------

let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;
  if (!isConfigured()) {
    throw new Error('XPO credentials not configured (XPO_AUTH_KEY / XPO_USERNAME / XPO_PASSWORD / XPO_BILL_ACCOUNT)');
  }

  const body = new URLSearchParams({
    grant_type: 'password',
    username: process.env.XPO_USERNAME,
    password: process.env.XPO_PASSWORD,
  }).toString();

  const data = await _request('POST', AUTH_URL, {
    Authorization: `Basic ${process.env.XPO_AUTH_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }, body);

  const token = data.access_token || data.accessToken;
  if (!token) throw new Error('XPO /token returned no access_token');

  cachedToken = token;
  tokenExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
  return cachedToken;
}

function clearToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

async function _authenticatedRequest(method, url, body) {
  const send = async () => _request(method, url, {
    Authorization: `Bearer ${await getToken()}`,
    ...(body && { 'Content-Type': 'application/json' }),
  }, body ? JSON.stringify(body) : null);

  try {
    return await send();
  } catch (err) {
    if (err.statusCode === 401) {
      clearToken();
      return send();
    }
    throw err;
  }
}

function rateQuote(body) {
  return _authenticatedRequest('POST', RATE_URL, body);
}

// getShipmentStatus: current status + estimated/final delivery dates for a PRO number.
function getShipmentStatus(pro) {
  return _authenticatedRequest('GET',
    `${TRACKING_BASE}/shipments/shipment-status-details?referenceNumbers=${encodeURIComponent(pro)}`);
}

// listShipmentTrackingEvents: full movement history for one PRO number.
function listTrackingEvents(pro) {
  return _authenticatedRequest('GET', `${TRACKING_BASE}/shipments/${encodeURIComponent(pro)}/tracking-events`);
}

module.exports = { isConfigured, getToken, clearToken, rateQuote, getShipmentStatus, listTrackingEvents };
