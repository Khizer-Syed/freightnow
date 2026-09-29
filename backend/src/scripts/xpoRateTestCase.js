#!/usr/bin/env node
/**
 * XPO Logistics — LTL Rating API Test Case
 *
 * Fires a real getXpoLtlRateQuote request per the XPO_API_Rating_Guide.pdf, using the
 * account credentials from APIs/XPO/README.docx. No separate "test" environment is
 * documented for this API (the guide only lists a Production endpoint), so this hits
 * production directly — a rate quote is read-only (no shipment/BOL is created), matching
 * how this Integrator setup is meant to be tested per XPO's own onboarding email.
 *
 * Usage:  node backend/src/scripts/xpoRateTestCase.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const https = require('https');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');

const AUTH_URL = 'https://api.xpo.com/token';
const RATE_URL = 'https://api.ltl.xpo.com/rating/1.0/ratequotes';
const OUT_DIR = path.resolve(__dirname, '../../../xpo_test_output');

function rawRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyBuf = body ? Buffer.from(body) : null;
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        ...headers,
        'Accept-Encoding': 'gzip, deflate, identity',
        ...(bodyBuf && { 'Content-Length': bodyBuf.length }),
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const encoding = res.headers['content-encoding'];
        const done = (text) => resolve({ status: res.statusCode, body: text });
        if (encoding === 'gzip') zlib.gunzip(buf, (e, d) => e ? reject(e) : done(d.toString()));
        else if (encoding === 'deflate') zlib.inflate(buf, (e, d) => e ? reject(e) : done(d.toString()));
        else done(buf.toString());
      });
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

async function getToken() {
  const authKey = process.env.XPO_AUTH_KEY;
  const username = process.env.XPO_USERNAME;
  const password = process.env.XPO_PASSWORD;
  if (!authKey) throw new Error('XPO_AUTH_KEY not set in .env');
  if (!username || !password) throw new Error('XPO_USERNAME / XPO_PASSWORD not set in .env');

  // XPO's LTL API security page (not the onboarding email) documents this as an OAuth2
  // "password" grant: the Basic header carries the consumer key/secret (the "Key" from the
  // setup email), and the body separately carries the actual XPO LTL registered user's
  // username/password.
  const body = new URLSearchParams({ grant_type: 'password', username, password }).toString();

  const res = await rawRequest('POST', AUTH_URL, {
    Authorization: `Basic ${authKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }, body);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`XPO auth failed (${res.status}): ${res.body}`);
  }
  const data = JSON.parse(res.body);
  const token = data.access_token || data.accessToken;
  if (!token) throw new Error(`XPO auth response had no access_token: ${res.body}`);
  return token;
}

function getNextBusinessDay() {
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Acquiring OAuth token from', AUTH_URL, '...');
  const token = await getToken();
  console.log('Token acquired.');

  // Cross-border LTL, per CLAUDE.md's description of XPO's actual scope for this
  // integration (LTL, Cross-border) — Toronto, ON -> Chicago, IL, matching the same lane
  // used to verify CSA/Polaris/DHL earlier in this project.
  const shipDate = `${getNextBusinessDay()}T12:00:00.000-0500`;
  const requestBody = {
    shipmentInfo: {
      paymentTermCd: 'P',
      accessorials: [],
      commodity: [{
        grossWeight: { weight: 500, weightUom: 'LBS' },
        nmfcClass: '70',
        hazmatInd: false,
        pieceCnt: 2,
        dimensions: { length: 48, width: 40, height: 40, dimensionsUom: 'INCH' },
      }],
      shipper: { address: { postalCd: 'M5V3A8' } },
      consignee: { address: { postalCd: '60601' } },
      // Bill-To (3rd party) account from the XPO onboarding email — uses this account's
      // real pricing agreement, per business rule 4 in the Rating Guide.
      bill2Party: { acctInstId: process.env.XPO_BILL_ACCOUNT },
      shipmentDate: shipDate,
      palletCnt: 1,
      linealFt: 0,
    },
  };

  fs.writeFileSync(path.join(OUT_DIR, 'rate_request.json'), JSON.stringify(requestBody, null, 2));
  console.log('Request saved. Calling Rate API...');

  const res = await rawRequest('POST', RATE_URL, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }, JSON.stringify(requestBody));

  fs.writeFileSync(path.join(OUT_DIR, 'rate_response.json'), res.body);
  console.log(`\nHTTP ${res.status}`);

  if (res.status < 200 || res.status >= 300) {
    console.error('FAILED:', res.body);
    process.exit(1);
  }

  const data = JSON.parse(res.body);
  const rq = data.data?.rateQuote;
  if (!rq) {
    console.log('No rateQuote in response:', JSON.stringify(data, null, 2));
    return;
  }

  console.log('\n=== Rate Quote ===');
  console.log('Confirmation #:', rq.confirmationNbr);
  console.log('Total charge:', rq.totCharge?.[0]?.amt, rq.totCharge?.[0]?.currencyCd);
  console.log('Total accessorial:', rq.totAccessorialAmt?.amt);
  console.log('Total discount:', rq.totDiscountAmt?.amt);
  if (data.data.transitTime) {
    console.log('Transit days:', data.data.transitTime.transitDays);
    console.log('Est. delivery:', new Date(data.data.transitTime.estdDlvrDate).toISOString().split('T')[0]);
  }
  console.log('\nFull response saved to:', path.join(OUT_DIR, 'rate_response.json'));
}

run().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
