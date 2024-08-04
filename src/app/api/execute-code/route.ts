import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const requestBody = await request.json();
        
        const { code, projectDir } = requestBody;

        if (!code) {
          throw new Error('No code provided');
        }

        if (!projectDir) {
          throw new Error('No project directory provided');
        }

        // Split the code into separate commands
        const commands = code.split('\n').filter((cmd: string) => cmd.trim() !== '');

        for (const command of commands) {
          await executeCommand(command, projectDir, controller, encoder, request.signal);
        }

        controller.close();
      } catch (error) {
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

async function executeCommand(command: string, projectDir: string, controller: ReadableStreamDefaultController, encoder: TextEncoder, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, [], {
      cwd: projectDir,
      shell: true,
    });

    childProcess.stdout?.on('data', (data) => {
      controller.enqueue(encoder.encode(`STDOUT: ${data}`));
    });

    childProcess.stderr?.on('data', (data) => {
      controller.enqueue(encoder.encode(`STDERR: ${data}`));
    });

    childProcess.on('close', (code) => {
      controller.enqueue(encoder.encode(`Command "${command}" exited with code ${code}\n`));
      resolve();
    });

    childProcess.on('error', (error) => {
      controller.enqueue(encoder.encode(`Error executing "${command}": ${error.message}\n`));
      reject(error);
    });

    signal.addEventListener('abort', () => {
      childProcess.kill();
      controller.enqueue(encoder.encode(`Command "${command}" cancelled\n`));
      resolve();
    });
  });
}