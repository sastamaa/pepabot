const fetch = require('node-fetch');
const BASE = 'https://api.bybit.com';

// Топ N монет за 24h обʼємом (автоматично)
async function getTopSymbols(limit = 20) {
  const res = await fetch(`${BASE}/v5/market/tickers?category=linear`);
  const data = await res.json();

  return data.result.list
    .filter(t => t.symbol.endsWith('USDT'))  // тільки USDT пари
    .sort((a, b) => parseFloat(b.turnover24h) - parseFloat(a.turnover24h))  // сортуємо за обʼємом
    .slice(0, limit)  // беремо топ N
    .map(t => t.symbol);
}

// Свічки 5m для монети
async function getKlines(symbol, limit = 60) {
  const res = await fetch(`${BASE}/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=${limit}`);
  const data = await res.json();
  if (!data.result?.list?.length) return null;
  return data.result.list.reverse().map(k => ({
    open:   parseFloat(k[1]),
    high:   parseFloat(k[2]),
    low:    parseFloat(k[3]),
    close:  parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));
}

module.exports = { getTopSymbols, getKlines };
