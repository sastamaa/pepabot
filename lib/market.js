const fetch = require('node-fetch');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getTopSymbols(limit = 10) {
  return [
    'BTCUSDT','ETHUSDT','SOLUSDT','AVAXUSDT','BNBUSDT',
    'XRPUSDT','DOGEUSDT','LINKUSDT','SUIUSDT','WIFUSDT'
  ].slice(0, limit);
}

async function getKlines(symbol, limit = 60) {
  try {
    await sleep(300); // 300мс між запитами — Binance дозволяє 1200 req/хв
    const url = 'https://api.binance.com/api/v3/klines?symbol=' + symbol + '&interval=15m&limit=' + limit;
    const res  = await fetch(url, { timeout: 10000 });
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('❌ ' + symbol + ': неочікувана відповідь', data);
      return null;
    }

    // Binance формат: [openTime, open, high, low, close, volume, ...]
    return data.map(k => ({
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));

  } catch (e) {
    console.error('❌ ' + symbol + ':', e.message);
    return null;
  }
}

module.exports = { getTopSymbols, getKlines };
