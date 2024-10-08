export function parseCommand(cmd: string, previousLine: string): { filePath: string | null; newContent: string | null } {

  let filePath: string | null = null;
  let newContent: string | null = null;

  // Check if the previous line indicates a file content command
  const filePathMatch = previousLine.match(/^# (.+)/);
  if (filePathMatch) {
    filePath = filePathMatch[1].trim();
    newContent = cmd.trim();
    return { filePath, newContent };
  }

  // normal command
  newContent = cmd.trim();
  return { filePath, newContent };
}