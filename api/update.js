const TelegramBot = require('node-telegram-bot-api');  // ← додай цей рядок нагорі!
const { getTopSymbols, getKlines } = require('../lib/bybit');
const { analyzeSignal } = require('../lib/indicators');
const { sendSignal } = require('../lib/telegram');

module.exports = async (req, res) => {
  try {
    // Автоматично беремо топ-25 монет за обʼємом
    const symbols = await getTopSymbols(25);
    console.log('Перевіряємо монети:', symbols);

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

    // Якщо немає сигналів — надіслати коротке повідомлення
    if (signals.length === 0) {
      const bot = new (require('node-telegram-bot-api'))(process.env.BOT_TOKEN);
      await bot.sendMessage(process.env.CHAT_ID, '🔍 Перевірено топ-25 монет — сигналів немає. Чекаємо...');
    }

    const result = `✅ Перевірено: ${symbols.length} монет | Сигналів: ${signals.length}`;
    console.log(result);
    res.status(200).json({
      message: result,
      symbols,
      signals: signals.map(s => s.symbol)
    });

  } catch (e) {
    console.error('Критична помилка:', e.message);
    res.status(500).json({ error: e.message });
  }
};
