const http = require('http');

console.log('Starting simple HTTP server...');

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Simple server running' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Simple server running on http://localhost:${PORT}`);
});



