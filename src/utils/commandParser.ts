export function parseCommand(cmd: string, previousLine: string): { filePath: string | null; newContent: string | null } {
  console.log("pl: "+previousLine);

  let filePath: string | null = null;
  let newContent: string | null = null;

  // Check if the previous line indicates a file content command
  const filePathMatch = previousLine.match(/contents of (.+)/);
  if (filePathMatch) {
    filePath = filePathMatch[1].trim();
    newContent = cmd.trim();
    console.log("file: "+ filePath);
    return { filePath, newContent };
  }

  // normal command
  newContent = cmd.trim();
  console.log("cmd: "+ newContent);
  return { filePath, newContent };
}
