const fetch = require('node-fetch');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── ТОП-20 МОНЕТ НА BYBIT ──────────────────────────
// Відсортовані за об'ємом і ліквідністю на Bybit Spot
const TOP_SYMBOLS = [
  'BTC-USDT',   // #1 — Bitcoin
  'ETH-USDT',   // #2 — Ethereum
  'SOL-USDT',   // #3 — Solana
  'XRP-USDT',   // #4 — Ripple
  'BNB-USDT',   // #5 — Binance Coin
  'DOGE-USDT',  // #6 — Dogecoin
  'ADA-USDT',   // #7 — Cardano
  'AVAX-USDT',  // #8 — Avalanche
  'LINK-USDT',  // #9 — Chainlink
  'SUI-USDT',   // #10 — Sui
  'TRX-USDT',   // #11 — Tron
  'WLD-USDT',   // #12 — Worldcoin
  'LTC-USDT',   // #13 — Litecoin
  'BCH-USDT',   // #14 — Bitcoin Cash
  'FIL-USDT',   // #15 — Filecoin
  'HYPE-USDT',  // #16 — Hyperliquid
  'PYTH-USDT', // #17 — PYTH
  'WIF-USDT',   // #18 — Dogwifhat
  'APT-USDT',   // #19 — Aptos
  'PENGU-USDT', // #20 — Pudgy Penguins
];

// ─── ОТРИМАТИ СПИСОК СИМВОЛІВ ───────────────────────
function getTopSymbols(limit = 20) {
  const symbols = TOP_SYMBOLS.slice(0, limit);
  console.log('📊 Список монет (' + symbols.length + '):', symbols.join(', '));
  return Promise.resolve(symbols);
}

// ─── СВІЧКИ З OKX ───────────────────────────────────
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
