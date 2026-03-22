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

function waveTrend(klines, n1 = 10, n2 = 21) {
  if (klines.length < n1 + n2 + 10) return null;
  const ap = klines.map(k => (k.high + k.low + k.close) / 3);
  const k1 = 2 / (n1 + 1);
  let esaVal = ap[0];
  const esa = [];
  for (let i = 0; i < ap.length; i++) {
    esaVal = ap[i] * k1 + esaVal * (1 - k1);
    esa.push(esaVal);
  }
  const absD = ap.map((v, i) => Math.abs(v - esa[i]));
  let dVal = absD[0];
  const d = [];
  for (let i = 0; i < absD.length; i++) {
    dVal = absD[i] * k1 + dVal * (1 - k1);
    d.push(dVal);
  }
  const ci = ap.map((v, i) => d[i] !== 0 ? (v - esa[i]) / (0.015 * d[i]) : 0);
  const k2 = 2 / (n2 + 1);
  let tciVal = ci[0];
  const wt1arr = [];
  for (let i = 0; i < ci.length; i++) {
    tciVal = ci[i] * k2 + tciVal * (1 - k2);
    wt1arr.push(tciVal);
  }
  const wt1 = wt1arr[wt1arr.length - 1];
  const wt2 = wt1arr.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const prevWt1 = wt1arr[wt1arr.length - 2];
  const prevWt2 = wt1arr.slice(-5, -1).reduce((a, b) => a + b, 0) / 4;
  return {
    wt1: wt1.toFixed(2),
    wt2: wt2.toFixed(2),
    crossUp:    prevWt1 <= prevWt2 && wt1 > wt2,
    crossDown:  prevWt1 >= prevWt2 && wt1 < wt2,
    overbought: wt1 > 60,
    oversold:   wt1 < -60
  };
}

function analyzeSignal(klines, symbol) {
  if (!klines || klines.length < 60) return null;

  const closes  = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);
  const price   = closes[closes.length - 1];

  const ema20  = ema(closes.slice(-25), 20);
  const ema50  = ema(closes, 50);
  const rsiVal = rsi(closes);
  const atrVal = atr(klines);
  const wt     = waveTrend(klines);

  const atrPercent  = (atrVal / price) * 100;
  if (atrPercent < 0.05) return null;

  const avgVol      = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio    = volumes[volumes.length - 1] / avgVol;
  const priceChange = ((price - closes[closes.length - 4]) / closes[closes.length - 4]) * 100;

  const last3    = closes.slice(-3);
  const upCount  = (last3[2] > last3[1] ? 1 : 0) + (last3[1] > last3[0] ? 1 : 0);
  const downCount= (last3[2] < last3[1] ? 1 : 0) + (last3[1] < last3[0] ? 1 : 0);

  const wtLabel = wt ? ('WT:' + wt.wt1 + (wt.crossUp ? '🔼' : wt.crossDown ? '🔽' : '➡️')) : 'WT:N/A';
  console.log(symbol + ' | RSI:' + rsiVal.toFixed(1) + ' | ATR:' + atrPercent.toFixed(3) + '% | vol:' + volRatio.toFixed(2) + 'x | EMA:' + (ema20 > ema50 ? 'UP' : 'DOWN') + ' | ' + wtLabel);

  const wtLong  = wt ? (!wt.overbought && parseFloat(wt.wt1) > parseFloat(wt.wt2)) : true;
  const wtShort = wt ? (!wt.oversold   && parseFloat(wt.wt1) < parseFloat(wt.wt2)) : true;

  if (ema20 > ema50 && rsiVal > 50 && rsiVal < 80 && wtLong && upCount >= 1) {
    const score = rsiVal + (volRatio * 5) + (atrPercent * 20) + (wt && wt.crossUp ? 20 : 0);
    return {
      direction: 'LONG',
      price, score,
      rsi: rsiVal.toFixed(1),
      priceChange: priceChange.toFixed(2),
      wt: wt ? wt.wt1 : 'N/A',
      sl: (price - atrVal * 1.5).toFixed(4),
      tp: (price + atrVal * 3).toFixed(4)
    };
  }

  if (ema20 < ema50 && rsiVal < 50 && rsiVal > 20 && wtShort && downCount >= 1) {
    const score = (100 - rsiVal) + (volRatio * 5) + (atrPercent * 20) + (wt && wt.crossDown ? 20 : 0);
    return {
      direction: 'SHORT',
      price, score,
      rsi: rsiVal.toFixed(1),
      priceChange: priceChange.toFixed(2),
      wt: wt ? wt.wt1 : 'N/A',
      sl: (price + atrVal * 1.5).toFixed(4),
      tp: (price - atrVal * 3).toFixed(4)
    };
  }

  return null;
}

module.exports = { analyzeSignal };
