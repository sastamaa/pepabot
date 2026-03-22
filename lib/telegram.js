const TelegramBot = require('node-telegram-bot-api');

function sendSignal(symbol, signal) {
  const bot = new TelegramBot(process.env.BOT_TOKEN);
  const chatId = process.env.CHAT_ID;
  const emoji = signal.direction === 'LONG' ? '🟢' : '🔴';

  const lines = [
    emoji + ' *' + signal.direction + ' ' + symbol + '*',
    '💰 Ціна: `' + signal.price + '` USDT',
    '📈 Рух: ' + signal.priceChange + '% за 45 хв',
    '📊 RSI: ' + signal.rsi,
    '〰️ WaveTrend: ' + (signal.wt || 'N/A')
  ];

  if (signal.fvg) {
    lines.push('🕳 FVG: ' + signal.fvg);
  }

  if (signal.ob) {
    lines.push('🧱 Order Block: ' + signal.ob);
  }

  // ✅ НОВЕ — Demand/Supply зони
  if (signal.demand) {
    lines.push('🏗 Demand Zone: ' + signal.demand);
  }

  if (signal.supply) {
    lines.push('🏗 Supply Zone: ' + signal.supply);
  }

  lines.push('🛑 SL: `' + signal.sl + '`');
  lines.push('🎯 TP: `' + signal.tp + '`');
  lines.push('⏱ Таймфрейм: 15m');

  const msg = lines.join('\n');
  return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

module.exports = { sendSignal };
