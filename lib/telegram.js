const TelegramBot = require('node-telegram-bot-api');

function sendSignal(symbol, signal) {
  const bot = new TelegramBot(process.env.BOT_TOKEN);
  const chatId = process.env.CHAT_ID;
  const emoji = signal.direction === 'LONG' ? '🟢' : '🔴';

  const msg = [
    emoji + ' *' + signal.direction + ' ' + symbol + '*',
    '💰 Ціна: `' + signal.price + '` USDT',
    '📈 Рух: ' + signal.priceChange + '% за 45 хв',
    '📊 RSI: ' + signal.rsi,
    '〰️ WaveTrend: ' + (signal.wt || 'N/A'),
    '🛑 SL: `' + signal.sl + '`',
    '🎯 TP: `' + signal.tp + '`',
    '⏱ Таймфрейм: 15m'
  ].join('\n');

  return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

module.exports = { sendSignal };
