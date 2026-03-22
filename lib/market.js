const fetch = require('node-fetch');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Отримуємо топ монет по об'єму з OKX прямо зараз
async function getTopSymbols(limit = 20) {
  try {
    const url = 'https://www.okx.com/api/v5/market/tickers?instType=SPOT';
    const res  = await fetch(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();

    if (data.code !== '0' || !data.data?.length) {
      console.warn('⚠️ Не вдалось отримати топ — використовуємо запасний список');
      return getFallback(limit);
    }

    // Фільтруємо тільки USDT пари + сортуємо по об'єму в USDT (volCcy24h)
    const sorted = data.data
      .filter(t =>
        t.instId.endsWith('-USDT') &&
        !t.instId.includes('USDC') &&
        parseFloat(t.volCcy24h) > 0
      )
      .sort((a, b) => parseFloat(b.volCcy24h) - parseFloat(a.volCcy24h))
      .slice(0, limit)
      .map(t => t.instId);

    console.log('📊 Топ ' + limit + ' монет по об\'єму:', sorted.join(', '));
    return sorted;

  } catch (e) {
    console.error('❌ getTopSymbols помилка:', e.message);
    return getFallback(limit);
  }
}

// Запасний список якщо API недоступний
function getFallback(limit) {
  return [
    'BTC-USDT','ETH-USDT','SOL-USDT','XRP-USDT','BNB-USDT',
    'DOGE-USDT','AVAX-USDT','LINK-USDT','SUI-USDT','WIF-USDT',
    'ADA-USDT','DOT-USDT','MATIC-USDT','UNI-USDT','ATOM-USDT',
    'LTC-USDT','BCH-USDT','APT-USDT','ARB-USDT','OP-USDT'
  ].slice(0, limit);
}

async function getKlines(symbol, limit = 60) {
  try {
    await sleep(300);
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
