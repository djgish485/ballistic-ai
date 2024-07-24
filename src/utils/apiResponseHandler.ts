import { Message } from '@/types/chat';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function truncateField(field: any): string {
  return typeof field === 'string' ? field.substring(0, 20) : JSON.stringify(field).substring(0, 20);
}

function filterMessages(messages: Message[]): { role: string, content: string }[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

export async function fetchAPIResponse(apiKey: { type: string; key: string }, systemPrompt: string, messages: Message[]) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let body: any;

  const filteredMessages = filterMessages(messages);

  console.log("Messages being sent to the API:");
  filteredMessages.forEach((msg, index) => {
    console.log(`Message ${index}:`);
    Object.keys(msg).forEach(key => {
      console.log(`  ${key}: ${truncateField((msg as any)[key])}`);
    });
  });

  if (apiKey.type === 'Claude') {
    headers['x-api-key'] = apiKey.key;
    headers['anthropic-version'] = '2023-06-01';
    headers["anthropic-beta"] = "max-tokens-3-5-sonnet-2024-07-15";
    body = {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 8192,
      system: systemPrompt,
      messages: filteredMessages,
      stream: true
    };
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API request failed with status ${response.status}: ${errorText}`);
    }

    return response;
  } else if (apiKey.type === 'OpenAI') {
    headers['Authorization'] = `Bearer ${apiKey.key}`;
    body = {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...filteredMessages],
      max_tokens: 4096,
      stream: true
    };
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API request failed with status ${response.status}: ${errorText}`);
    }

    return response;
  } else {
    throw new Error('Unsupported API type');
  }
}
