const fetch = require('node-fetch');
const BASE = 'https://api.bybit.com';

// Хелпер для безпечних запитів
async function safeFetch(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: 10000  // 10 секунд таймаут
  });

  const text = await res.text();  // спочатку text, не json

  // Перевірка чи це справді JSON
  if (!text.startsWith('{') && !text.startsWith('[')) {
    throw new Error(`Bybit відповів не JSON: ${text.slice(0, 100)}`);
  }

  return JSON.parse(text);
}

// Топ N монет за 24h обʼємом
async function getTopSymbols(limit = 25) {
  const data = await safeFetch(`${BASE}/v5/market/tickers?category=linear`);

  if (!data?.result?.list) throw new Error('Немає даних від Bybit tickers');

  return data.result.list
    .filter(t => t.symbol.endsWith('USDT'))
    .sort((a, b) => parseFloat(b.turnover24h) - parseFloat(a.turnover24h))
    .slice(0, limit)
    .map(t => t.symbol);
}

// Свічки 5m для монети
async function getKlines(symbol, limit = 60) {
  const data = await safeFetch(
    `${BASE}/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=${limit}`
  );

  if (!data?.result?.list?.length) return null;

  return data.result.list.reverse().map(k => ({
    open:   parseFloat(k[1]),
    high:   parseFloat(k[2]),
    low:    parseFloat(k[3]),
    close:  parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));
}

module.exports = { getTopSymbols, getKlines };
