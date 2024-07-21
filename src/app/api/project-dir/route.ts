import { NextResponse } from 'next/server';
import path from 'path';

export async function GET() {
  // This should be the directory where the Superhero app is launched
  // For development purposes, we're using the parent directory of the current working directory
  // In a production environment, you'd want to implement proper security measures
  // to ensure this path is safe and authorized
  const projectDir = path.resolve(process.cwd(), '..');
  
  return NextResponse.json({ projectDir });
}
