const express = require('express');
const http = require('http');
const next = require('next');
const path = require('path');
const net = require('net');

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

const projectDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
const portArgIndex = process.argv.indexOf('--port');
let specifiedPort = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : null;

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

if (!projectDir) {
  console.error('Error: Project directory not provided.');
  console.error('Usage: npm run start -- <project_directory> [--port <port_number>]');
  console.error('Example: npm run start -- /path/to/your/project --port 3000');
  process.exit(1);
}

app.prepare().then(async () => {
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

  const defaultPort = specifiedPort || 3000;
  let port = defaultPort;

  try {
    port = await findAvailablePort(defaultPort);
    
    if (port !== defaultPort) {
      console.error(`Port ${defaultPort} is not available. Please use the command with: --port ${port}`);
      return process.exit(1);
    }

    httpServer.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
      console.log('> Project directory:', projectDir);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
});