import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();
    console.log('Received file path:', filePath);

    if (!filePath) {
      console.log('Error: File path is required');
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Normalize the path to remove any '..' or '.' components
    const normalizedPath = path.normalize(filePath);

    // Check if the normalized path is the same as the original path
    // This helps prevent directory traversal attacks
    if (normalizedPath !== filePath) {
      console.log('Error: Invalid file path');
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    console.log('Attempting to read file:', normalizedPath);

    const content = await fs.readFile(normalizedPath, 'utf8');
    console.log('File content read successfully. Length:', content.length);

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
