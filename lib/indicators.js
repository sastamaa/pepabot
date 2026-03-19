// EMA
function ema(data, period) {
  const k = 2 / (period + 1);
  let val = data[0];
  for (let i = 1; i < data.length; i++) val = data[i] * k + val * (1 - k);
  return val;
}

// RSI
function rsi(closes, period = 14) {
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

// Аналіз сигналу для монети
function analyzeSignal(klines) {
  if (!klines || klines.length < 55) return null;

  const closes = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);
  const price = closes[closes.length - 1];

  const ema20 = ema(closes.slice(-25), 20);
  const ema50 = ema(closes, 50);
  const rsiVal = rsi(closes);
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const lastVol = volumes[volumes.length - 1];
  const volSpike = lastVol > avgVol * 1.8;

  // Зміна ціни за останні 3 свічки
  const priceChange = ((price - closes[closes.length - 4]) / closes[closes.length - 4]) * 100;

  // LONG умови
  if (
    ema20 > ema50 &&
    price > ema20 &&
    rsiVal > 55 && rsiVal < 80 &&
    volSpike &&
    priceChange > 0.5
  ) {
    return {
      direction: 'LONG',
      price,
      rsi: rsiVal.toFixed(1),
      priceChange: priceChange.toFixed(2),
      sl: (price * 0.993).toFixed(4),
      tp: (price * 1.02).toFixed(4)
    };
  }

  // SHORT умови
  if (
    ema20 < ema50 &&
    price < ema20 &&
    rsiVal < 45 && rsiVal > 20 &&
    volSpike &&
    priceChange < -0.5
  ) {
    return {
      direction: 'SHORT',
      price,
      rsi: rsiVal.toFixed(1),
      priceChange: priceChange.toFixed(2),
      sl: (price * 1.007).toFixed(4),
      tp: (price * 0.98).toFixed(4)
    };
  }

  return null;
}

module.exports = { analyzeSignal };
