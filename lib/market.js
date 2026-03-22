const fetch = require('node-fetch');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getTopSymbols(limit = 10) {
  return [
    'BTC-USDT','ETH-USDT','SOL-USDT','AVAX-USDT','BNB-USDT',
    'XRP-USDT','DOGE-USDT','LINK-USDT','SUI-USDT','WIF-USDT'
  ].slice(0, limit);
}

async function getKlines(symbol, limit = 60) {
  try {
    await sleep(300);
    // OKX — публічний API, без ключа, без гео-блокувань
    const url = 'https://www.okx.com/api/v5/market/candles?instId=' + symbol + '&bar=15m&limit=' + limit;
    const res  = await fetch(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();

    if (data.code !== '0' || !data.data?.length) {
      console.error('❌ ' + symbol + ':', data.msg || 'немає даних');
      return null;
    }

    // OKX формат: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
    // Від нових до старих — розвертаємо!
    return data.data.reverse().map(k => ({
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
