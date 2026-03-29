const TelegramBot = require('node-telegram-bot-api');
const { getTopSymbols, getKlines } = require('../lib/market');
const { analyzeSignal } = require('../lib/indicators');
const { sendSignal, isDuplicate } = require('../lib/telegram');

// ─── РИНКОВИЙ ЗВІТ (раз на годину) ──────────────────
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

module.exports = async (req, res) => {
  const send = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  };

  try {
    const bot     = new TelegramBot(process.env.BOT_TOKEN);
    const symbols = await getTopSymbols(20);  // ✅ завжди топ-20, один раунд

    const allSignals = [];

    for (const symbol of symbols) {
      try {
        const klines = await getKlines(symbol);
        const signal = klines ? analyzeSignal(klines, symbol) : null;
        if (signal) allSignals.push({ symbol, signal });
      } catch (e) {
        console.error('Помилка ' + symbol + ':', e.message);
      }
    }

    console.log('📊 Перевірено: ' + symbols.length + ' | Знайдено сигналів: ' + allSignals.length);

    // Фільтруємо дублікати і беремо топ-3
    const top3 = allSignals
      .sort((a, b) => b.signal.score - a.signal.score)
      .filter(({ symbol, signal }) => !isDuplicate(symbol, signal.direction))
      .slice(0, 3);

    if (top3.length === 0) {
      await sendMarketReport(bot, 0, symbols.length);
    } else {
      await bot.sendMessage(
        process.env.CHAT_ID,
        '📊 *Топ-' + top3.length + ' сигнали* (з ' + symbols.length + ' монет)',
        { parse_mode: 'Markdown' }
      );
      for (const { symbol, signal } of top3) {
        await sendSignal(symbol, signal);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    send(200, {
      message: '✅ Перевірено: ' + symbols.length + ' | Знайдено: ' + allSignals.length + ' | Відправлено: ' + top3.length,
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
