import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      throw new Error('No code provided');
    }

    const { stdout, stderr } = await execPromise(code);

    return NextResponse.json({
      output: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message || 'An unknown error occurred',
    }, { status: 500 });
  }
}
