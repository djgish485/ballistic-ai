const express = require('express');
const next = require('next');
const path = require('path');

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

const projectDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

app.prepare().then(() => {
  const server = express();

  server.use('/project-files', express.static(projectDir));

  server.get('/api/project-dir', (req, res) => {
    res.json({ projectDir });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log('> Project directory:', projectDir);
  });
});
