const TelegramBot = require('node-telegram-bot-api');
const { getTopSymbols, getKlines } = require('../lib/market');  // ← новий файл
const { analyzeSignal } = require('../lib/indicators');
const { sendSignal } = require('../lib/telegram');

module.exports = async (req, res) => {
  try {
    const symbols = await getTopSymbols(25);
    console.log('✅ Монети отримано:', symbols.join(', '));

    const signals = [];

    for (const symbol of symbols) {
      try {
        const klines = await getKlines(symbol);
        const signal = analyzeSignal(klines);
        if (signal) {
          signals.push({ symbol, signal });
          await sendSignal(symbol, signal);
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (e) {
        console.error(`Помилка ${symbol}:`, e.message);
      }
    }

    if (signals.length === 0) {
      const bot = new TelegramBot(process.env.BOT_TOKEN);
      await bot.sendMessage(
        process.env.CHAT_ID,
        '🔍 Перевірено топ-25 монет — сигналів немає. Чекаємо...'
      );
    }

    res.status(200).json({
      message: `✅ Перевірено: ${symbols.length} | Сигналів: ${signals.length}`,
      symbols,
      signals: signals.map(s => s.symbol)
    });

  } catch (e) {
    console.error('Критична помилка:', e.message);
    res.status(500).json({ error: e.message });
  }
};
