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
    const debug = [];

    for (const symbol of symbols) {
      try {
        const klines = await getKlines(symbol);

        if (!klines) {
          debug.push({ symbol, status: 'NULL klines' });
          continue;
        }

        const closes = klines.map(k => k.close);
        const volumes = klines.map(k => k.volume);
        const price = closes[closes.length - 1];
        const avgVol = volumes.slice(-20).reduce((a,b)=>a+b,0)/20;
        const volRatio = (volumes[volumes.length-1]/avgVol).toFixed(2);
        const priceChange = ((price - closes[closes.length-4])/closes[closes.length-4]*100).toFixed(2);

        // Проста EMA
        function ema(data, p) {
          const k = 2/(p+1); let v = data[0];
          for(let i=1;i<data.length;i++) v=data[i]*k+v*(1-k);
          return v;
        }
        const ema20 = ema(closes.slice(-25), 20);
        const ema50 = ema(closes, 50);

        // RSI
        let g=0,l=0;
        const sl = closes.slice(-15);
        for(let i=1;i<sl.length;i++){const d=sl[i]-sl[i-1];d>0?g+=d:l+=Math.abs(d);}
        const rsiVal = (100-100/(1+g/(l||0.001))).toFixed(1);

        debug.push({
          symbol,
          price,
          ema20: ema20.toFixed(4),
          ema50: ema50.toFixed(4),
          trend: ema20 > ema50 ? 'UP⬆️' : 'DOWN⬇️',
          rsi: rsiVal,
          volRatio,
          priceChange: priceChange + '%'
        });

        const signal = analyzeSignal(klines, symbol);
        if (signal) allSignals.push({ symbol, signal });

      } catch (e) {
        debug.push({ symbol, error: e.message });
      }
    }

    const top3 = allSignals
      .sort((a, b) => b.signal.score - a.signal.score)
      .slice(0, 3);

    const bot = new TelegramBot(process.env.BOT_TOKEN);

    if (top3.length === 0) {
      await bot.sendMessage(process.env.CHAT_ID, '🔍 Перевірено монети — сигналів немає. Чекаємо...');
    } else {
      await bot.sendMessage(process.env.CHAT_ID, `📊 *Топ-${top3.length} сигнали*`, { parse_mode: 'Markdown' });
      for (const { symbol, signal } of top3) {
        await sendSignal(symbol, signal);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    send(200, {
      message: `✅ Перевірено: ${symbols.length} | Знайдено: ${allSignals.length} | Відправлено: ${top3.length}`,
      debug,
      top3: top3.map(s => ({ symbol: s.symbol, direction: s.signal.direction, score: s.signal.score?.toFixed(1) }))
    });

  } catch (e) {
    send(500, { error: e.message });
  }
};
