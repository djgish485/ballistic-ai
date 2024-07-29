const express = require('express');
const http = require('http');
const next = require('next');
const path = require('path');
const net = require('net');
const readline = require('readline');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const projectDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

// Make projectDir available to all routes
global.projectDir = projectDir;

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

app.prepare().then(async () => {
  const server = express();
  const httpServer = http.createServer(server);

  server.use('/project-files', express.static(projectDir));

  server.get('/api/project-dir', (req, res) => {
    res.json({ projectDir });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const defaultPort = 3000;
  let port = defaultPort;

  try {
    port = await findAvailablePort(defaultPort);
    
    if (port !== defaultPort) {
      console.log(`Port ${defaultPort} is not available. Suggested port: ${port}`);
      const answer = await promptUser(`Do you want to use port ${port}? (y/n) `);
      
      if (answer !== 'y') {
        console.log('Server startup cancelled by user.');
        process.exit(0);
      }
    }

    httpServer.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
      console.log('> Project directory:', projectDir);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  } finally {
    rl.close();
  }
});
