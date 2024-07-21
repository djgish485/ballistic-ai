const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const next = require('next');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const projectDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  server.use((req, res, next) => {
    req.io = io;
    next();
  });

  server.use('/project-files', express.static(projectDir));

  server.get('/api/project-dir', (req, res) => {
    res.json({ projectDir });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
    console.log('> Project directory:', projectDir);
  });
});
