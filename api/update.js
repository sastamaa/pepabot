const TelegramBot = require('node-telegram-bot-api');
const { getTopSymbols, getKlines } = require('../lib/market');
const { analyzeSignal } = require('../lib/indicators');
const { sendSignal } = require('../lib/telegram');

module.exports = async (req, res) => {
  // Хелпер для відповіді (замість res.status().json())
  const send = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

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

    send(200, {
      message: `✅ Перевірено: ${symbols.length} | Сигналів: ${signals.length}`,
      symbols,
      signals: signals.map(s => s.symbol)
    });

  } catch (e) {
    console.error('Критична помилка:', e.message);
    send(500, { error: e.message });
  }
};
