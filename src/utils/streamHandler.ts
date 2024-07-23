import { ReadableStream } from 'stream/web';

export function createResponseStream(apiKey: { type: string; key: string }, apiResponse: Response, setMessages: (messages: any) => void) {
  return new ReadableStream({
    async start(controller) {
      const reader = apiResponse.body!.getReader();
      let fullResponse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                let content = '';
                if (apiKey.type === 'Claude' && data.type === 'content_block_delta' && data.delta?.text) {
                  content = data.delta.text;
                } else if (apiKey.type === 'OpenAI' && data.choices && data.choices[0].delta.content) {
                  content = data.choices[0].delta.content;
                }
                if (content) {
                  fullResponse += content;
                  controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
                }
              } catch (error) {
                console.error('Error parsing JSON:', error);
              }
            }
          }
        }

        setMessages((prev: any) => [...prev, { role: 'assistant', content: fullResponse }]);
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}
