import { Message } from '../types/chat';

export async function createBackup(projectDir: string) {
  try {
    const response = await fetch('/api/project-backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir }),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, message: data.message };
    } else {
      throw new Error(data.error || 'Failed to create backup');
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendChatMessage(projectDir: string, message: string, isInitial: boolean, conversationHistory: Message[], selectedAPIKeyIndex: string | null) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      projectDir, 
      message, 
      isInitial, 
      conversationHistory,
      selectedAPIKeyIndex
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }

  return response;
}

export async function restoreBackup(projectDir: string) {
  try {
    const response = await fetch('/api/project-backup', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir }),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, message: data.message };
    } else {
      throw new Error(data.error || 'Failed to restore backup');
    }
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
