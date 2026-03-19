const TelegramBot = require('node-telegram-bot-api');
const { getTopSymbols, getKlines } = require('../lib/market');
const { analyzeSignal } = require('../lib/indicators');
const { sendSignal } = require('../lib/telegram');

module.exports = async (req, res) => {
  const send = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  };

  try {
    const symbols = await getTopSymbols(20);
    const allSignals = [];

    // Збираємо всі сигнали
    for (const symbol of symbols) {
      try {
        const klines = await getKlines(symbol);
        const signal = klines ? analyzeSignal(klines, symbol) : null;
        if (signal) allSignals.push({ symbol, signal });
      } catch (e) {
        console.error(`Помилка ${symbol}:`, e.message);
      }
    }

    // Сортуємо за score і беремо топ-3
    const top3 = allSignals
      .sort((a, b) => b.signal.score - a.signal.score)
      .slice(0, 3);

    const bot = new TelegramBot(process.env.BOT_TOKEN);

    if (top3.length === 0) {
      await bot.sendMessage(
        process.env.CHAT_ID,
        '🔍 Перевірено 20 монет — сигналів немає. Чекаємо...'
      );
    } else {
      // Спочатку заголовок
      await bot.sendMessage(
        process.env.CHAT_ID,
        `📊 *Топ-${top3.length} сигнали* (з 20 монет)`,
        { parse_mode: 'Markdown' }
      );
      // Потім кожен сигнал окремо
      for (const { symbol, signal } of top3) {
        await sendSignal(symbol, signal);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    send(200, {
      message: `✅ Перевірено: ${symbols.length} | Знайдено: ${allSignals.length} | Відправлено: ${top3.length}`,
      top3: top3.map(s => ({ symbol: s.symbol, direction: s.signal.direction, score: s.signal.score.toFixed(1) }))
    });

  } catch (e) {
    console.error('Критична помилка:', e.message);
    send(500, { error: e.message });
  }
};
