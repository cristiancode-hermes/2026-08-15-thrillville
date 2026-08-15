// Dev/proxy server: sirve el dist de Angular y proxya /api a la API local
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '../apps/web/dist');
const API_PORT = 3064;
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function findIndex(dir) {
  // Busca recursivamente el primer index.html (Angular 22: dist/<project>/browser/)
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    const idx = path.join(d, 'index.html');
    if (fs.existsSync(idx)) return d;
    let entries = [];
    try {
      entries = fs.readdirSync(d);
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(d, e);
      if (fs.statSync(p).isDirectory()) stack.push(p);
    }
  }
  return dir;
}

const STATIC_ROOT = findIndex(DIST);
console.log('Sirviendo dist desde:', STATIC_ROOT);

http
  .createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
      const proxy = http.request(
        { host: 'localhost', port: API_PORT, path: req.url, method: req.method, headers: req.headers },
        (pRes) => {
          res.writeHead(pRes.statusCode, pRes.headers);
          pRes.pipe(res);
        },
      );
      proxy.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'API no disponible' }));
      });
      req.pipe(proxy);
      return;
    }
    let file = path.normalize(path.join(STATIC_ROOT, req.url.split('?')[0]));
    if (!file.startsWith(STATIC_ROOT)) {
      res.writeHead(403);
      return res.end();
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(STATIC_ROOT, 'index.html');
    }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`CineNova web en http://localhost:${PORT}`));
