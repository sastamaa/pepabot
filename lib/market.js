const fetch = require('node-fetch');

async function safeFetch(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000
  });
  const text = await res.text();
  console.log(`📡 ${url.slice(0, 70)} → ${res.status} | ${text.slice(0, 80)}`);
  if (!text.startsWith('{') && !text.startsWith('[')) throw new Error(`Не JSON: ${text.slice(0, 80)}`);
  return JSON.parse(text);
}

async function getTopSymbols(limit = 22) {
  return [
    'BTC','ETH','SOL','AVAX','BNB','XRP','DOGE',
    'LINK','OP','ARB','SUI','APT','NEAR','DOT',
    'ADA','LTC','ATOM','TON','MATIC','FIL',
    'WIF','PYTH'
  ].slice(0, limit);
}

// CryptoCompare — працює з будь-якого сервера, безкоштовний
async function getKlines(symbol, limit = 60) {
  try {
    // Хвилинні свічки з CryptoCompare
    const data = await safeFetch(
      `https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USDT&limit=${limit}&aggregate=5`
    );

    if (data?.Response !== 'Success' || !data?.Data?.Data?.length) {
      console.log(`⛔ ${symbol} — CryptoCompare помилка: ${data?.Message}`);
      return null;
    }

    return data.Data.Data.map(k => ({
      open:   k.open,
      high:   k.high,
      low:    k.low,
      close:  k.close,
      volume: k.volumefrom
    }));

  } catch (e) {
    console.error(`❌ ${symbol}:`, e.message);
    return null;
  }
}

module.exports = { getTopSymbols, getKlines };
