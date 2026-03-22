const TelegramBot = require('node-telegram-bot-api');

// ✅ Кеш: зберігаємо останній сигнал по кожній монеті
const signalCache = {};
const SIGNAL_COOLDOWN = 60 * 60 * 1000; // 1 година між однаковими сигналами

function isDuplicate(symbol, direction) {
  const key = symbol + '_' + direction;
  const last = signalCache[key];
  if (!last) return false;
  return (Date.now() - last) < SIGNAL_COOLDOWN;
}

function markSent(symbol, direction) {
  const key = symbol + '_' + direction;
  signalCache[key] = Date.now();
}

function sendSignal(symbol, signal) {
  // ✅ Перевірка дубліката — не надсилаємо якщо вже був сигнал < 1 год тому
  if (isDuplicate(symbol, signal.direction)) {
    console.log('⏭ Пропускаємо дублікат: ' + symbol + ' ' + signal.direction);
    return Promise.resolve();
  }

  const bot    = new TelegramBot(process.env.BOT_TOKEN);
  const chatId = process.env.CHAT_ID;
  const emoji  = signal.direction === 'LONG' ? '🟢' : '🔴';

  const lines = [
    emoji + ' *' + signal.direction + ' ' + symbol + '*',
    '💰 Ціна: `' + signal.price + '` USDT',
    '📈 Рух: ' + signal.priceChange + '% за 45 хв',
    '📊 RSI: ' + signal.rsi,
    '〰️ WaveTrend: ' + (signal.wt || 'N/A')
  ];

  if (signal.contraTrend) {
    lines.push('⚠️ Контртренд — зменши розмір позиції!');
  }
  if (signal.fvg)    lines.push('🕳 FVG: '          + signal.fvg);
  if (signal.ob)     lines.push('🧱 Order Block: '  + signal.ob);
  if (signal.demand) lines.push('🏗 Demand Zone: '  + signal.demand);
  if (signal.supply) lines.push('🏗 Supply Zone: '  + signal.supply);

  // R:R розрахунок
  const entry  = parseFloat(signal.price);
  const sl     = parseFloat(signal.sl);
  const tp     = parseFloat(signal.tp);
  const rr     = (Math.abs(entry - tp) / Math.abs(entry - sl)).toFixed(1);

  lines.push('🛑 SL: `' + signal.sl + '`');
  lines.push('🎯 TP: `' + signal.tp + '`');
  lines.push('📐 R:R = 1:' + rr);
  lines.push('⏱️ Таймфрейм: 15m');

  const msg = lines.join('\n');

  // ✅ Позначаємо як відправлений
  markSent(symbol, signal.direction);

  return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}
// Додай в кінці файлу перед module.exports
let lastMarketReport = 0;

function sendMarketReport(signals, total) {
  // Надсилаємо звіт тільки раз на годину
  if (Date.now() - lastMarketReport < 60 * 60 * 1000) return Promise.resolve();
  lastMarketReport = Date.now();

  const bot    = new TelegramBot(process.env.BOT_TOKEN);
  const chatId = process.env.CHAT_ID;

  const msg = [
    '📊 *Ринковий звіт*',
    '🔍 Перевірено монет: ' + total,
    '📈 Сигналів знайдено: ' + signals,
    signals === 0 ? '😴 Ринок в корекції — чекаємо розвороту' : '✅ Сигнали відправлені',
    '🕐 ' + new Date().toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kiev' })
  ].join('\n');

  return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

module.exports = { sendSignal, sendMarketReport };
