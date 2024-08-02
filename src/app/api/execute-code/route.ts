import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { Readable } from 'stream';

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('Received request to execute code.');
        const requestBody = await request.json();
        console.log('Request body:', requestBody);
        
        const { code, projectDir } = requestBody;

        if (!code) {
          throw new Error('No code provided');
        }

        if (!projectDir) {
          throw new Error('No project directory provided');
        }

        console.log('Executing code:');
        console.log(code);

        // Change the working directory to the project directory
        const originalCwd = process.cwd();
        process.chdir(projectDir);

        try {
          const childProcess = exec(code);

          let stdoutBuffer = '';
          let stderrBuffer = '';

          childProcess.stdout?.on('data', (data) => {
            stdoutBuffer += data;
            if (stdoutBuffer.includes('\n')) {
              const lines = stdoutBuffer.split('\n');
              stdoutBuffer = lines.pop() || '';
              lines.forEach(line => {
                controller.enqueue(encoder.encode(`STDOUT: ${line}\n`));
              });
            }
          });

          childProcess.stderr?.on('data', (data) => {
            stderrBuffer += data;
            if (stderrBuffer.includes('\n')) {
              const lines = stderrBuffer.split('\n');
              stderrBuffer = lines.pop() || '';
              lines.forEach(line => {
                controller.enqueue(encoder.encode(`STDERR: ${line}\n`));
              });
            }
          });

          childProcess.on('close', (code) => {
            if (stdoutBuffer) {
              controller.enqueue(encoder.encode(`STDOUT: ${stdoutBuffer}\n`));
            }
            if (stderrBuffer) {
              controller.enqueue(encoder.encode(`STDERR: ${stderrBuffer}\n`));
            }
            controller.enqueue(encoder.encode(`Process exited with code ${code}\n`));
            controller.close();
          });

          childProcess.on('error', (error) => {
            controller.enqueue(encoder.encode(`Error: ${error.message}\n`));
            controller.close();
          });

          // Handle cancellation
          request.signal.addEventListener('abort', () => {
            console.log('Received abort signal, terminating child process');
            childProcess.kill();
            controller.enqueue(encoder.encode('Execution cancelled\n'));
            controller.close();
          });
        } finally {
          // Change back to the original working directory
          process.chdir(originalCwd);
        }
      } catch (error) {
        console.error('Error during code execution:', error);
        controller.enqueue(encoder.encode(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}\n`));
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  });
}