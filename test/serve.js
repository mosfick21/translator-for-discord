/* Serves test/mock-discord.html over http so the extension's content script
   will run against it — content scripts do not run on file:// URLs.

   Usage: node test/serve.js [port]     (default 8899) */

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.argv[2]) || 8899;
const page = path.join(__dirname, 'mock-discord.html');

http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(204).end();
    return;
  }
  fs.readFile(page, (err, body) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' }).end(String(err));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(body);
  });
}).listen(port, () => {
  console.log(`mock Discord on http://localhost:${port}/`);
});
