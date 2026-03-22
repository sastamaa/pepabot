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
    await sleep(300);
    // Bybit API — безкоштовно, без ключа, не блокує
    const url = 'https://api.bybit.com/v5/market/kline?category=spot&symbol=' + symbol + '&interval=15&limit=' + limit;
    const res  = await fetch(url, { timeout: 10000 });
    const data = await res.json();

    if (data.retCode !== 0 || !data.result?.list?.length) {
      console.error('❌ ' + symbol + ':', data.retMsg || 'немає даних');
      return null;
    }

    // Bybit формат: [startTime, open, high, low, close, volume, turnover]
    // Список йде від нових до старих — треба розвернути!
    return data.result.list.reverse().map(k => ({
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
