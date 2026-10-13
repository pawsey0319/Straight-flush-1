const crypto = require('node:crypto');

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function getVisitorId(request, response) {
  const cookies = parseCookies(request);
  if (cookies.clarity_visitor) return cookies.clarity_visitor;
  const visitorId = crypto.randomUUID();
  response.setHeader('Set-Cookie', `clarity_visitor=${encodeURIComponent(visitorId)}; Path=/; Max-Age=7776000; HttpOnly; Secure; SameSite=Lax`);
  return visitorId;
}

function cors(response) {
  const allowed = process.env.PUBLIC_ORIGIN || '*';
  response.setHeader('Access-Control-Allow-Origin', allowed);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function json(response, status, payload) {
  cors(response);
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(payload));
}

function methodGuard(request, response, methods = ['POST']) {
  cors(response);
  if (request.method === 'OPTIONS') { response.status(204).end(); return false; }
  if (!methods.includes(request.method)) { json(response, 405, { error: 'method_not_allowed' }); return false; }
  return true;
}

function traceId(prefix = 'trace') { return `${prefix}_${crypto.randomUUID()}`; }

module.exports = { getVisitorId, json, methodGuard, traceId };
