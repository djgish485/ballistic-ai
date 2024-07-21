import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    console.log('Received request to execute code.');
    const requestBody = await request.json();
    console.log('Request body:', requestBody);
    
    const { code } = requestBody;

    if (!code) {
      throw new Error('No code provided');
    }

    console.log('Executing code:');
    console.log(code);

    const { stdout, stderr } = await execPromise(code);

    console.log('Execution output - STDOUT:', stdout);
    console.log('Execution output - STDERR:', stderr);

    return NextResponse.json({
      output: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
    });
  } catch (error) {
    console.error('Error during code execution:', error);
    return NextResponse.json({
      error: error.message || 'An unknown error occurred',
    }, { status: 500 });
  }
}
