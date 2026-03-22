const fetch = require('node-fetch');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const BLOCKLIST = [
  'PAXG-USDT', 'XAUT-USDT', 'WBTC-USDT', 'WETH-USDT', 'HBTC-USDT',
  'USDC-USDT', 'DAI-USDT', 'TUSD-USDT', 'FDUSD-USDT', 'PYUSD-USDT',
  'USDE-USDT', 'SUSD-USDT', 'USDP-USDT', 'USDD-USDT', 'FRAX-USDT'
];

// ✅ Отримуємо список монет доступних на Bybit SPOT
async function getBybitSymbols() {
  try {
    const url = 'https://api.bybit.com/v5/market/instruments-info?category=spot&limit=500';
    const res  = await fetch(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();

    if (data.retCode !== 0 || !data.result?.list?.length) {
      console.warn('⚠️ Bybit список недоступний');
      return null;
    }

    // Повертаємо Set для швидкої перевірки — формат BTC-USDT
    const symbols = new Set(
      data.result.list
        .filter(s => s.quoteCoin === 'USDT' && s.status === 'Trading')
        .map(s => s.baseCoin + '-USDT')
    );

    console.log('✅ Bybit доступно монет:', symbols.size);
    return symbols;

  } catch (e) {
    console.error('❌ getBybitSymbols:', e.message);
    return null;
  }
}

async function getTopSymbols(limit = 20) {
  try {
    // Отримуємо топ OKX і список Bybit паралельно
    const [okxRes, bybitSymbols] = await Promise.all([
      fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT', {
        timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      getBybitSymbols()
    ]);

    const data = await okxRes.json();

    if (data.code !== '0' || !data.data?.length) {
      console.warn('⚠️ OKX недоступний — використовуємо запасний список');
      return getFallback(limit);
    }

    const sorted = data.data
      .filter(t => {
        const sym = t.instId;
        // Базові фільтри
        if (!sym.endsWith('-USDT'))          return false;
        if (sym.includes('USDC'))            return false;
        if (BLOCKLIST.includes(sym))         return false;
        if (parseFloat(t.volCcy24h) < 500000) return false;
        if (parseFloat(t.last) < 0.001)      return false;
        // ✅ Перевірка що монета є на Bybit
        if (bybitSymbols && !bybitSymbols.has(sym)) {
          console.log('⛔ Немає на Bybit:', sym);
          return false;
        }
        return true;
      })
      .sort((a, b) => parseFloat(b.volCcy24h) - parseFloat(a.volCcy24h))
      .slice(0, limit)
      .map(t => t.instId);

    if (!sorted.length) {
      console.warn('⚠️ Порожній список — використовуємо запасний');
      return getFallback(limit);
    }

    console.log('📊 Топ ' + sorted.length + ' монет (є на Bybit):', sorted.join(', '));
    return sorted;

  } catch (e) {
    console.error('❌ getTopSymbols:', e.message);
    return getFallback(limit);
  }
}

function getFallback(limit) {
  return [
    'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'XRP-USDT', 'BNB-USDT',
    'DOGE-USDT', 'AVAX-USDT', 'LINK-USDT', 'SUI-USDT', 'WIF-USDT',
    'ADA-USDT', 'DOT-USDT', 'UNI-USDT', 'ATOM-USDT', 'LTC-USDT',
    'BCH-USDT', 'APT-USDT', 'ARB-USDT', 'OP-USDT', 'NEAR-USDT'
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
