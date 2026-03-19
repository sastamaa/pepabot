const fetch = require('node-fetch');
const BASE = 'https://fapi.binance.com';

async function safeFetch(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    timeout: 10000
  });
  const text = await res.text();
  if (!text.startsWith('{') && !text.startsWith('[')) {
    throw new Error(`Binance відповів не JSON: ${text.slice(0, 100)}`);
  }
  return JSON.parse(text);
}

async function getTopSymbols(limit = 25) {
  const data = await safeFetch(`${BASE}/fapi/v1/ticker/24hr`);

  // Перевірка — має бути масив
  if (!Array.isArray(data)) {
    console.error('Binance повернув:', JSON.stringify(data).slice(0, 200));
    throw new Error(`Очікували масив, отримали: ${typeof data}`);
  }

  return data
    .filter(t => t.symbol.endsWith('USDT'))
    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, limit)
    .map(t => t.symbol);
}

async function getKlines(symbol, limit = 60) {
  const data = await safeFetch(
    `${BASE}/fapi/v1/klines?symbol=${symbol}&interval=5m&limit=${limit}`
  );

  // Перевірка — має бути масив
  if (!Array.isArray(data)) return null;
  if (data.length === 0) return null;

  return data.map(k => ({
    open:   parseFloat(k[1]),
    high:   parseFloat(k[2]),
    low:    parseFloat(k[3]),
    close:  parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));
}

module.exports = { getTopSymbols, getKlines };
