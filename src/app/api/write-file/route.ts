import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { filePath, content } = await request.json();
    
    console.log('Received request to write file:', { filePath, contentLength: content?.length });

    if (!filePath || content === undefined) {
      console.error('File path or content is missing');
      return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
    }

    // Access projectDir from global
    const projectDir = (global as any).projectDir;

    console.log('Project directory:', projectDir);

    if (!projectDir) {
      console.error('Project directory not available');
      return NextResponse.json({ error: 'Project directory not available' }, { status: 500 });
    }

    const fullPath = path.resolve(filePath);

    console.log('Full path:', fullPath);

    // Check if the file is within the project directory
    if (!fullPath.startsWith(projectDir)) {
      console.error('Invalid file path: File is outside the project directory');
      return NextResponse.json({ error: 'Invalid file path: File is outside the project directory' }, { status: 400 });
    }

    // Check if the file exists
    try {
      await fs.access(fullPath);
      console.log('File exists');
    } catch (error) {
      // File doesn't exist, create the directory and an empty file
      console.log('File does not exist, creating directory and empty file');
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, '');
      console.log(`Created new file: ${fullPath}`);
    }

    // Write the content to the file
    await fs.writeFile(fullPath, content, 'utf8');
    console.log('File written successfully');

    return NextResponse.json({ message: 'File updated successfully' });
  } catch (error) {
    console.error('Error in write-file API route:', error);
    return NextResponse.json(
      { error: 'Failed to write file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
