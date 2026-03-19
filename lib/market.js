const fetch = require('node-fetch');

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

// Топ монети за РЕАЛЬНИМ 24h обʼємом (автоматично з ринку)
async function getTopSymbols(limit = 30) {
  try {
    const data = await safeFetch(
      `https://min-api.cryptocompare.com/data/top/totalvolfull?limit=${limit}&tsym=USDT`
    );

    if (!data?.Data?.length) throw new Error('Немає даних');

    const symbols = data.Data
      .map(item => item?.CoinInfo?.Name)
      .filter(Boolean);

    console.log(`📊 Топ монети за обʼємом: ${symbols.join(', ')}`);
    return symbols;

  } catch (e) {
    console.error('Помилка getTopSymbols:', e.message);
    // Запасний список
    return ['BTC','ETH','SOL','AVAX','BNB','XRP','DOGE','LINK','OP','ARB',
            'SUI','APT','NEAR','DOT','ADA','LTC','ATOM','TON','MATIC','FIL'];
  }
}

// Свічки 5m з CryptoCompare
async function getKlines(symbol, limit = 60) {
  try {
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
