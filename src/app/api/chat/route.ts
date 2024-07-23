import { NextRequest, NextResponse } from 'next/server';
import { getProjectFiles } from '@/utils/projectUtils';
import { getSelectedAPIKey, readAPIKeys } from '@/utils/apiKeyManager';
import { fetchAPIResponse } from '@/utils/apiResponseHandler';
import { getInitialPrompt, constructInitialMessage, constructServerMessages } from '@/utils/messageProcessor';
import { createResponseStream } from '@/utils/streamHandler';
import { Message } from '@/types/chat';

export async function POST(req: NextRequest) {
  try {
    const { projectDir, message, isInitial, conversationHistory, selectedAPIKeyIndex } = await req.json();

    if (!projectDir) {
      return NextResponse.json({ error: 'Project directory is required' }, { status: 400 });
    }

    let apiKey = selectedAPIKeyIndex !== null
      ? readAPIKeys().keys[parseInt(selectedAPIKeyIndex)]
      : getSelectedAPIKey();

    if (!apiKey) {
      throw new Error('No API key selected');
    }

    const initialPrompt = getInitialPrompt();
    const projectFiles = await getProjectFiles(projectDir);
    const systemPrompt = initialPrompt;
    const initialMessage = constructInitialMessage(projectFiles);

    const serverMessages = constructServerMessages(isInitial, initialMessage, conversationHistory, message);

    const apiResponse = await fetchAPIResponse(apiKey, systemPrompt, serverMessages);

    const stream = createResponseStream(apiKey, apiResponse, (messages: Message[]) => {
      // This function would typically update some state, but in this context it's a no-op
      console.log('Messages updated:', messages);
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ 
      error: 'An error occurred while processing the chat',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}