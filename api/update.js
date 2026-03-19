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
    const symbols = await getTopSymbols(25);
    const debug = [];
    const signals = [];

    for (const symbol of symbols) {
      try {
        const klines = await getKlines(symbol);

        // Діагностика — що повертає getKlines
        const klinesInfo = klines
          ? `отримано ${klines.length} свічок, остання ціна: ${klines[klines.length-1]?.close}`
          : 'NULL — свічки не отримані!';

        const signal = klines ? analyzeSignal(klines, symbol) : null;

        debug.push({
          symbol,
          klines: klinesInfo,
          signal: signal ? signal.direction : 'немає'
        });

        if (signal) {
          signals.push({ symbol, signal });
          await sendSignal(symbol, signal);
          await new Promise(r => setTimeout(r, 500));
        }

      } catch (e) {
        debug.push({ symbol, error: e.message });
      }
    }

    if (signals.length === 0) {
      const bot = new TelegramBot(process.env.BOT_TOKEN);
      await bot.sendMessage(process.env.CHAT_ID, '🔍 Перевірено топ-25 монет — сигналів немає. Чекаємо...');
    }

    send(200, {
      message: `✅ Перевірено: ${symbols.length} | Сигналів: ${signals.length}`,
      debug,  // ← тут побачимо де проблема
      signals: signals.map(s => s.symbol)
    });

  } catch (e) {
    console.error('Критична помилка:', e.message);
    send(500, { error: e.message });
  }
};
