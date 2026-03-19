const http = require('http');
const update = require('./api/update');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/update') {
    await update(req, res);
  } else {
    res.writeHead(200);
    res.end('Bybit Signal Bot працює! 🚀');
  }
});

server.listen(PORT, () => console.log(`Сервер запущено на порті ${PORT}`));
