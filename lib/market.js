const fetch = require('node-fetch');
const BASE = 'https://fapi.binance.com';

async function safeFetch(url) {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    },
    timeout: 15000
  });

  const text = await res.text();
  console.log(`📡 ${url.slice(0, 60)} → статус: ${res.status}, відповідь: ${text.slice(0, 150)}`);

  if (!text.startsWith('{') && !text.startsWith('[')) {
    throw new Error(`Не JSON: ${text.slice(0, 100)}`);
  }

  const parsed = JSON.parse(text);

  // Binance повертає об'єкт з помилкою типу { code: -1130, msg: "..." }
  if (parsed.code && parsed.msg) {
    throw new Error(`Binance помилка ${parsed.code}: ${parsed.msg}`);
  }

  return parsed;
}

async function getTopSymbols(limit = 25) {
  // Спробуємо fapi/v1, якщо не спрацює — запасний варіант
  let data;
  try {
    data = await safeFetch(`${BASE}/fapi/v1/ticker/24hr`);
  } catch (e) {
    console.error('fapi/v1 не спрацював:', e.message);
    // Запасний варіант — hardcoded топ монети
    return [
      'BTCUSDT','ETHUSDT','SOLUSDT','AVAXUSDT','BNBUSDT',
      'XRPUSDT','DOGEUSDT','LINKUSDT','OPUSDT','ARBUSDT',
      'SUIUSDT','APTUSDT','NEARUSDT','DOTUSDT','ADAUSDT',
      'LTCUSDT','ATOMUSDT','TONUSDT','MATICUSDT','FILUSDT'
    ].slice(0, limit);
  }

  if (!Array.isArray(data)) {
    console.error('Отримали не масив:', JSON.stringify(data).slice(0, 200));
    // Запасний варіант
    return [
      'BTCUSDT','ETHUSDT','SOLUSDT','AVAXUSDT','BNBUSDT',
      'XRPUSDT','DOGEUSDT','LINKUSDT','OPUSDT','ARBUSDT',
      'SUIUSDT','APTUSDT','NEARUSDT','DOTUSDT','ADAUSDT',
      'LTCUSDT','ATOMUSDT','TONUSDT','MATICUSDT','FILUSDT'
    ].slice(0, limit);
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

  if (!Array.isArray(data) || data.length === 0) return null;

  return data.map(k => ({
    open:   parseFloat(k[1]),
    high:   parseFloat(k[2]),
    low:    parseFloat(k[3]),
    close:  parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));
}

module.exports = { getTopSymbols, getKlines };
