const fetch = require('node-fetch');

// Затримка між запитами
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeFetch(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000
  });
  const text = await res.text();
  if (!text.startsWith('{') && !text.startsWith('[')) throw new Error(`Не JSON: ${text.slice(0, 80)}`);
  const parsed = JSON.parse(text);
  if (parsed.Response === 'Error') throw new Error(`API: ${parsed.Message}`);
  return parsed;
}

async function getTopSymbols(limit = 10) {  // ← зменшили до 10
  return [
    'BTC','ETH','SOL','AVAX','BNB',
    'XRP','DOGE','PYTH','SUI','WIF'
  ].slice(0, limit);
}

async function getKlines(symbol, limit = 60) {
  try {
    await sleep(2000);  // ← 2 сек затримка між кожним запитом!
    const data = await safeFetch(
      `https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USDT&limit=${limit}&aggregate=5`
    );
    if (data?.Response !== 'Success' || !data?.Data?.Data?.length) return null;
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
