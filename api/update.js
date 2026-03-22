const TelegramBot = require('node-telegram-bot-api');
const { getTopSymbols, getKlines } = require('../lib/market');
const { analyzeSignal } = require('../lib/indicators');
const { sendSignal, isDuplicate } = require('../lib/telegram');

let lastMarketReport = 0;

async function sendMarketReport(bot, signalsFound, total) {
  if (Date.now() - lastMarketReport < 60 * 60 * 1000) return;
  lastMarketReport = Date.now();

  const time = new Date().toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kiev' });
  const msg = [
    '📊 *Ринковий звіт*',
    '🔍 Перевірено монет: ' + total,
    '📈 Сигналів знайдено: ' + signalsFound,
    signalsFound === 0 ? '😴 Ринок в корекції — чекаємо розвороту' : '✅ Сигнали відправлені',
    '🕐 ' + time
  ].join('\n');

  await bot.sendMessage(process.env.CHAT_ID, msg, { parse_mode: 'Markdown' });
}

// ✅ Сканує масив символів і повертає сигнали
async function scanSymbols(symbols) {
  const signals = [];
  for (const symbol of symbols) {
    try {
      const klines = await getKlines(symbol);
      const signal = klines ? analyzeSignal(klines, symbol) : null;
      if (signal) signals.push({ symbol, signal });
    } catch (e) {
      console.error('Помилка ' + symbol + ':', e.message);
    }
  }
  return signals;
}

module.exports = async (req, res) => {
  const send = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  };

  try {
    const bot = new TelegramBot(process.env.BOT_TOKEN);

    // ─── РАУНД 1: топ-20 ───────────────────────────
    const symbols1 = await getTopSymbols(20);
    let allSignals = await scanSymbols(symbols1);
    let totalScanned = symbols1.length;
    let round = 1;

    // ─── РАУНД 2: якщо немає сигналів — беремо 21-40 ──
    if (allSignals.length === 0) {
      console.log('🔄 Раунд 1 без сигналів — сканую монети 21-40...');
      const symbols2 = await getTopSymbols(40);
      const newSymbols = symbols2.slice(20); // тільки 21-40
      allSignals = await scanSymbols(newSymbols);
      totalScanned += newSymbols.length;
      round = 2;
    }

    // ─── РАУНД 3: якщо знову немає — беремо 41-60 ──
    if (allSignals.length === 0) {
      console.log('🔄 Раунд 2 без сигналів — сканую монети 41-60...');
      const symbols3 = await getTopSymbols(60);
      const newSymbols = symbols3.slice(40); // тільки 41-60
      allSignals = await scanSymbols(newSymbols);
      totalScanned += newSymbols.length;
      round = 3;
    }

    console.log('📊 Всього перевірено: ' + totalScanned + ' монет за ' + round + ' раунди');

    // Фільтруємо дублікати і беремо топ-3
    const top3 = allSignals
      .sort((a, b) => b.signal.score - a.signal.score)
      .filter(({ symbol, signal }) => !isDuplicate(symbol, signal.direction))
      .slice(0, 3);

    if (top3.length === 0) {
      await sendMarketReport(bot, 0, totalScanned);
    } else {
      await bot.sendMessage(
        process.env.CHAT_ID,
        '📊 *Топ-' + top3.length + ' сигнали* (перевірено ' + totalScanned + ' монет, раунд ' + round + ')',
        { parse_mode: 'Markdown' }
      );
      for (const { symbol, signal } of top3) {
        await sendSignal(symbol, signal);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    send(200, {
      message: '✅ Перевірено: ' + totalScanned + ' | Раундів: ' + round + ' | Знайдено: ' + allSignals.length + ' | Відправлено: ' + top3.length,
      top3: top3.map(s => ({
        symbol:    s.symbol,
        direction: s.signal.direction,
        score:     s.signal.score.toFixed(1)
      }))
    });

  } catch (e) {
    console.error('Критична помилка:', e.message);
    send(500, { error: e.message });
  }
};
