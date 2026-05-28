const { randomUUID } = require('crypto');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

module.exports = { clamp, createId, toNumber, lower };
