const fetch = require('node-fetch');

// Спробуємо різні API по черзі
const APIS = [
  'https://api.binance.com',      // Spot API
  'https://api1.binance.com',     // Резервний 1
  'https://api2.binance.com',     // Резервний 2
  'https://api3.binance.com',     // Резервний 3
];

async function safeFetch(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000
  });
  const text = await res.text();
  console.log(`📡 ${url.slice(0, 80)} → ${res.status} | ${text.slice(0, 100)}`);
  if (!text.startsWith('{') && !text.startsWith('[')) throw new Error(`Не JSON: ${text.slice(0,80)}`);
  const parsed = JSON.parse(text);
  if (parsed.code && parsed.msg) throw new Error(`API помилка ${parsed.code}: ${parsed.msg}`);
  return parsed;
}

// Топ монети (hardcoded — бо fapi блокується)
async function getTopSymbols(limit = 20) {
  return [
    'BTCUSDT','ETHUSDT','SOLUSDT','AVAXUSDT','BNBUSDT',
    'XRPUSDT','DOGEUSDT','LINKUSDT','OPUSDT','ARBUSDT',
    'SUIUSDT','APTUSDT','NEARUSDT','DOTUSDT','ADAUSDT',
    'LTCUSDT','ATOMUSDT','TONUSDT','MATICUSDT','FILUSDT'
  ].slice(0, limit);
}

// Пробуємо різні Binance endpoints для klines
async function getKlines(symbol, limit = 60) {
  const endpoints = [
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=${limit}`,
    `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=${limit}`,
    `https://api2.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=${limit}`,
    `https://api3.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=${limit}`,
  ];

  for (const url of endpoints) {
    try {
      const data = await safeFetch(url);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ ${symbol} — спрацював: ${url.slice(0, 50)}`);
        return data.map(k => ({
          open:   parseFloat(k[1]),
          high:   parseFloat(k[2]),
          low:    parseFloat(k[3]),
          close:  parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));
      }
    } catch (e) {
      console.log(`❌ ${url.slice(0,50)} — ${e.message}`);
    }
  }

  console.error(`⛔ ${symbol} — всі endpoints не спрацювали`);
  return null;
}

module.exports = { getTopSymbols, getKlines };
