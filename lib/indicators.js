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

// ─── FAIR VALUE GAPS (FVG) ──────────────────────────
// FVG = між свічкою[i-2].high і свічкою[i].low є "діра" (бичачий)
//       між свічкою[i-2].low і свічкою[i].high є "діра" (ведмежий)
function findFVG(klines) {
  const result = { bullish: null, bearish: null };
  // Шукаємо останній FVG в останніх 20 свічках
  for (let i = klines.length - 1; i >= 2 && i >= klines.length - 20; i--) {
    const prev2 = klines[i - 2];
    const curr  = klines[i];
    const price = klines[klines.length - 1].close;

    // Бичачий FVG: попередня свічка high < поточна свічка low
    if (!result.bullish && prev2.high < curr.low) {
      const gapTop    = curr.low;
      const gapBottom = prev2.high;
      const gapSize   = ((gapTop - gapBottom) / price) * 100;
      // Тільки якщо ціна ще не заповнила цей геп
      if (price > gapTop && gapSize > 0.05) {
        result.bullish = {
          top:     gapTop.toFixed(4),
          bottom:  gapBottom.toFixed(4),
          size:    gapSize.toFixed(3),
          filled:  false
        };
      }
    }

    // Ведмежий FVG: попередня свічка low > поточна свічка high
    if (!result.bearish && prev2.low > curr.high) {
      const gapTop    = prev2.low;
      const gapBottom = curr.high;
      const gapSize   = ((gapTop - gapBottom) / price) * 100;
      if (price < gapBottom && gapSize > 0.05) {
        result.bearish = {
          top:     gapTop.toFixed(4),
          bottom:  gapBottom.toFixed(4),
          size:    gapSize.toFixed(3),
          filled:  false
        };
      }
    }
  }
  return result;
}

// ─── ORDER BLOCKS (SMC) ─────────────────────────────
// Бичачий OB: остання ведмежа свічка перед сильним рухом вгору
// Ведмежий OB: остання бичача свічка перед сильним рухом вниз
function findOrderBlocks(klines) {
  const result = { bullish: null, bearish: null };
  const price  = klines[klines.length - 1].close;

  for (let i = klines.length - 3; i >= 2 && i >= klines.length - 25; i--) {
    const candle = klines[i];
    const next1  = klines[i + 1];
    const next2  = klines[i + 2];

    // Бичачий OB: ведмежа свічка (close < open) + наступні 2 свічки
    // різко йдуть вгору (імпульс)
    if (!result.bullish) {
      const isBearCandle = candle.close < candle.open;
      const impulseUp    = next1.close > candle.high && next2.close > next1.close;
      if (isBearCandle && impulseUp && price > candle.high) {
        result.bullish = {
          top:    candle.open.toFixed(4),   // верх ведмежої свічки
          bottom: candle.low.toFixed(4),    // низ ведмежої свічки
          // Якщо ціна повернулась в зону OB — сильний сигнал входу
          priceInZone: price >= candle.low && price <= candle.open
        };
      }
    }

    // Ведмежий OB: бичача свічка (close > open) + наступні 2 різко вниз
    if (!result.bearish) {
      const isBullCandle = candle.close > candle.open;
      const impulseDown  = next1.close < candle.low && next2.close < next1.close;
      if (isBullCandle && impulseDown && price < candle.low) {
        result.bearish = {
          top:    candle.high.toFixed(4),
          bottom: candle.close.toFixed(4),
          priceInZone: price >= candle.close && price <= candle.high
        };
      }
    }
  }
  return result;
}

// ─── ГОЛОВНИЙ АНАЛІЗ ────────────────────────────────
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
  const fvg    = findFVG(klines);
  const ob     = findOrderBlocks(klines);

  const atrPercent  = (atrVal / price) * 100;
  if (atrPercent < 0.05) return null;

  const avgVol      = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio    = volumes[volumes.length - 1] / avgVol;
  const priceChange = ((price - closes[closes.length - 4]) / closes[closes.length - 4]) * 100;

  const last3    = closes.slice(-3);
  const upCount  = (last3[2] > last3[1] ? 1 : 0) + (last3[1] > last3[0] ? 1 : 0);
  const downCount= (last3[2] < last3[1] ? 1 : 0) + (last3[1] < last3[0] ? 1 : 0);

  const wtLabel = wt ? ('WT:' + wt.wt1 + (wt.crossUp ? '🔼' : wt.crossDown ? '🔽' : '➡️')) : 'WT:N/A';
  const fvgLabel = fvg.bullish ? 'FVG:🟢' : fvg.bearish ? 'FVG:🔴' : 'FVG:—';
  const obLabel  = ob.bullish  ? ('OB:🟢' + (ob.bullish.priceInZone ? '🎯' : '')) : ob.bearish ? ('OB:🔴' + (ob.bearish.priceInZone ? '🎯' : '')) : 'OB:—';

  console.log(symbol + ' | RSI:' + rsiVal.toFixed(1) + ' | ' + wtLabel + ' | ' + fvgLabel + ' | ' + obLabel + ' | EMA:' + (ema20 > ema50 ? 'UP' : 'DOWN'));

  const wtLong  = wt ? (!wt.overbought && parseFloat(wt.wt1) > parseFloat(wt.wt2)) : true;
  const wtShort = wt ? (!wt.oversold   && parseFloat(wt.wt1) < parseFloat(wt.wt2)) : true;

  // Бонус до score якщо є FVG або OB підтвердження
  const fvgBonusLong  = fvg.bullish ? 15 : 0;
  const fvgBonusShort = fvg.bearish ? 15 : 0;
  const obBonusLong   = ob.bullish  ? (ob.bullish.priceInZone  ? 25 : 10) : 0;
  const obBonusShort  = ob.bearish  ? (ob.bearish.priceInZone  ? 25 : 10) : 0;

  // 🟢 LONG
  if (ema20 > ema50 && rsiVal > 50 && rsiVal < 80 && wtLong && upCount >= 1) {
    const score = rsiVal + (volRatio * 5) + (atrPercent * 20)
                + (wt && wt.crossUp ? 20 : 0)
                + fvgBonusLong + obBonusLong;
    return {
      direction: 'LONG',
      price, score,
      rsi:         rsiVal.toFixed(1),
      priceChange: priceChange.toFixed(2),
      wt:          wt ? wt.wt1 : 'N/A',
      fvg:         fvg.bullish ? ('gap ' + fvg.bullish.bottom + '-' + fvg.bullish.top) : null,
      ob:          ob.bullish  ? ('zone ' + ob.bullish.bottom + '-' + ob.bullish.top + (ob.bullish.priceInZone ? ' 🎯' : '')) : null,
      sl:          (price - atrVal * 1.5).toFixed(4),
      tp:          (price + atrVal * 3).toFixed(4)
    };
  }

  // 🔴 SHORT
  if (ema20 < ema50 && rsiVal < 50 && rsiVal > 20 && wtShort && downCount >= 1) {
    const score = (100 - rsiVal) + (volRatio * 5) + (atrPercent * 20)
                + (wt && wt.crossDown ? 20 : 0)
                + fvgBonusShort + obBonusShort;
    return {
      direction: 'SHORT',
      price, score,
      rsi:         rsiVal.toFixed(1),
      priceChange: priceChange.toFixed(2),
      wt:          wt ? wt.wt1 : 'N/A',
      fvg:         fvg.bearish ? ('gap ' + fvg.bearish.bottom + '-' + fvg.bearish.top) : null,
      ob:          ob.bearish  ? ('zone ' + ob.bearish.bottom + '-' + ob.bearish.top + (ob.bearish.priceInZone ? ' 🎯' : '')) : null,
      sl:          (price + atrVal * 1.5).toFixed(4),
      tp:          (price - atrVal * 3).toFixed(4)
    };
  }

  return null;
}

module.exports = { analyzeSignal };
