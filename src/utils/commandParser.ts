export function parseCommand(cmd: string): { filePath: string | null; newContent: string | null } {
  const lines = cmd.split('\n');
  let filePath: string | null = null;
  let newContent: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("cat << 'EOF' >")) {
      const match = line.match(/cat << 'EOF' > (.+)/);
      if (match && match[1]) {
        filePath = match[1].trim();
        const contentLines = lines.slice(i + 1);
        const eofIndex = contentLines.findIndex(l => l.startsWith('EOF'));
        if (eofIndex !== -1) {
          newContent = contentLines.slice(0, eofIndex).join('\n');
        } else {
          newContent = contentLines.join('\n');
        }
        break;
      }
    }
  }

  return { filePath, newContent };
}
