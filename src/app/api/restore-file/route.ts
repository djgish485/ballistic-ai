import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  const { filePath, content } = await request.json();
  const absoluteFilePath = path.resolve(filePath);

  try {
    await writeFile(absoluteFilePath, content, 'utf8');
    return NextResponse.json({ message: 'File restored successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to restore file', details: String(error) }, { status: 500 });
  }
}
