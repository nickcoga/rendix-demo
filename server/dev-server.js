import http from 'http';
import handler from '../api/extract.js';

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      req.body = body ? JSON.parse(body) : {};
    } catch {
      req.body = {};
    }

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };

    try {
      await handler(req, res);
    } catch (err) {
      if (!res.writableEnded) {
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Rendix Dev Proxy running on http://localhost:${PORT}/api/extract`);
});
