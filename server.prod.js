const express = require('express');
const http = require('http');
const next = require('next');
const path = require('path');

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

const projectDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);

  server.use('/project-files', express.static(projectDir));

  server.get('/api/project-dir', (req, res) => {
    res.json({ projectDir });
  });

  // Serve static files from the 'public' folder
  server.use(express.static(path.join(__dirname, 'public')));

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log('> Project directory:', projectDir);
  });
});