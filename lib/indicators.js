function ema(data, period) {
  const k = 2 / (period + 1);
  let val = data[0];
  for (let i = 1; i < data.length; i++) val = data[i] * k + val * (1 - k);
  return val;
}

function rsi(closes, period = 14) {
  let gains = 0, losses = 0;
  const slice = closes.slice(-(period + 1));
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  return 100 - 100 / (1 + gains / (losses || 0.001));
}

function atr(klines, period = 14) {
  const trs = klines.slice(-period).map((k, i, arr) => {
    const prev = i > 0 ? arr[i-1].close : k.close;
    return Math.max(k.high - k.low, Math.abs(k.high - prev), Math.abs(k.low - prev));
  });
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

function analyzeSignal(klines, symbol = '') {
  if (!klines || klines.length < 55) return null;

  const closes  = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);
  const price   = closes[closes.length - 1];

  const ema20  = ema(closes.slice(-25), 20);
  const ema50  = ema(closes, 50);
  const rsiVal = rsi(closes);
  const atrVal = atr(klines);
  const atrPercent = (atrVal / price) * 100;

  if (atrPercent < 0.05) return null;

  const avgVol   = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio = volumes[volumes.length - 1] / avgVol;
  const priceChange = ((price - closes[closes.length - 4]) / closes[closes.length - 4]) * 100;

  const last3 = closes.slice(-3);
  const upCount   = (last3[2]>last3[1]?1:0) + (last3[1]>last3[0]?1:0);
  const downCount = (last3[2]<last3[1]?1:0) + (last3[1]<last3[0]?1:0);

  console.log(`${symbol} | RSI:${rsiVal.toFixed(1)} | ATR:${atrPercent.toFixed(3)}% | vol:${volRatio.toFixed(2)}x | EMA:${ema20>ema50?'UP⬆️':'DOWN⬇️'} | up:${upCount}/2 | change:${priceChange.toFixed(2)}%`);

  // 🟢 LONG — прибрали volRatio фільтр, пом'якшили priceChange
  if (
    ema20 > ema50 &&
    rsiVal > 50 && rsiVal < 80
    // ← volRatio прибрано
    // ← priceChange прибрано
  ) {
    const score = rsiVal + (volRatio * 5) + (atrPercent * 20);
    return {
      direction: 'LONG', price, score,
      rsi: rsiVal.toFixed(1),
      priceChange: priceChange.toFixed(2),
      sl: (price - atrVal * 1.5).toFixed(4),
      tp: (price + atrVal * 3).toFixed(4)
    };
  }

  // 🔴 SHORT
  if (
    ema20 < ema50 &&
    rsiVal < 50 && rsiVal > 20
  ) {
    const score = (100 - rsiVal) + (volRatio * 5) + (atrPercent * 20);
    return {
      direction: 'SHORT', price, score,
      rsi: rsiVal.toFixed(1),
      priceChange: priceChange.toFixed(2),
      sl: (price + atrVal * 1.5).toFixed(4),
      tp: (price - atrVal * 3).toFixed(4)
    };
  }

  return null;
}

module.exports = { analyzeSignal };
