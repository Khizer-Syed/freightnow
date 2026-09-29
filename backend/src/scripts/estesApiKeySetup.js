#!/usr/bin/env node
/**
 * Estes Express — API Key Setup (test environment)
 *
 * Per APIs/Estes/README.docx: the Client ID/Secret aren't used directly on API calls — they're
 * only used once to obtain (or retrieve) a lifetime API Key, which is what every subsequent
 * request actually authenticates with.
 *
 * Safety: tries GET first (retrieve a previously issued key) before ever falling back to POST
 * (generate a new one) — POST is described as a one-time, lifetime-key action and each POST
 * response also rotates the Client Secret, so it shouldn't be run speculatively/repeatedly.
 *
 * Usage:  node backend/src/scripts/estesApiKeySetup.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://uat-cloudapi.estes-express.com';
const ENV_PATH = path.resolve(__dirname, '../../.env');

function request(method, url, authHeader) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function updateEnvVar(key, value) {
  let content = fs.readFileSync(ENV_PATH, 'utf8');
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=.*$`, 'm').test(content)) {
    content = content.replace(new RegExp(`^${key}=.*$`, 'm'), line);
  } else {
    content += `\n${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content);
}

async function run() {
  const clientId = process.env.ESTES_TEST_CLIENT_ID;
  const clientSecret = process.env.ESTES_TEST_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('ESTES_TEST_CLIENT_ID / ESTES_TEST_CLIENT_SECRET not set in .env');
    process.exit(1);
  }

  const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  console.log('Step 1: Checking for a previously issued API key (GET) ...');
  const getRes = await request('GET', `${BASE_URL}/v1/api-key`, authHeader);
  console.log(`  HTTP ${getRes.status}`);

  let result;
  if (getRes.status >= 200 && getRes.status < 300) {
    console.log('  A key already exists — using it, no need to generate a new one.');
    result = JSON.parse(getRes.body);
  } else {
    console.log('  Body:', getRes.body);
    console.log('\nStep 2: No existing key retrievable — generating one (POST, one-time) ...');
    const postRes = await request('POST', `${BASE_URL}/v1/api-key`, authHeader);
    console.log(`  HTTP ${postRes.status}`);
    console.log('  Body:', postRes.body);
    if (postRes.status < 200 || postRes.status >= 300) {
      console.error('\nFAILED to generate an API key.');
      console.error('Per the setup email: "You do need to be manually added into the test');
      console.error('environment. So if you find that you\'re getting errors, it\'s likely');
      console.error('that you haven\'t been added in yet." — this may just mean Estes needs');
      console.error('to add this account to the test environment before this will work.');
      process.exit(1);
    }
    result = JSON.parse(postRes.body);
  }

  const payload = result.data || result;
  const apiKey = payload.apiKey || payload.key || payload.api_key;
  const newSecret = payload.apiClientSecret || payload.clientSecret || payload.client_secret;

  if (!apiKey) {
    console.log('\nUnexpected response shape — full body:', JSON.stringify(result, null, 2));
    process.exit(1);
  }

  updateEnvVar('ESTES_API_KEY', apiKey);
  if (newSecret) {
    updateEnvVar('ESTES_TEST_CLIENT_SECRET', newSecret);
    console.log('\nRotated ESTES_TEST_CLIENT_SECRET in .env (Estes issues a new one on each call).');
  }
  console.log('Saved ESTES_API_KEY to .env.');
  console.log('\nDone — subsequent Estes API calls should use this API Key in the request header');
  console.log('(per the docs, Client ID/Secret are not needed for regular API calls).');
}

run().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
