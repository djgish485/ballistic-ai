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

    const apiResponse = await fetchAPIResponse(apiKey, systemPrompt, serverMessages, projectDir);

    const stream = createResponseStream(apiKey, apiResponse, (messages: Message[]) => {
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
    let errorMessage = 'An error occurred while processing the chat';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('rate_limit_error')) {
        errorDetails = 'Rate limit exceeded. Please try again later or reduce the length of your request.';
      } else if (error.message.includes('insufficient_quota')) {
        errorDetails = 'API quota exceeded. Please check your plan and billing details.';
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}