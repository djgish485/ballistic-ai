import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getProjectFilesDir } from '@/utils/directoryUtils';

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const projectDir = formData.get('projectDir') as string;

  if (!projectDir) {
    return NextResponse.json({ error: 'Project directory not provided' }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), getProjectFilesDir(projectDir));

  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(uploadDir, file.name);
      await writeFile(filePath, buffer);
      console.log(`File ${file.name} uploaded successfully`);
    }

    return NextResponse.json({ message: 'Files uploaded successfully' });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}
