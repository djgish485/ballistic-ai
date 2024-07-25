import { ReadableStream } from 'stream/web';

export function createResponseStream(apiKey: { type: string; key: string }, apiResponse: Response, setMessages: (messages: any) => void) {
  const startTime = Date.now();
  let tokenCount = 0;
  let totalResponseSize = 0;

  return new ReadableStream({
    async start(controller) {
      const reader = apiResponse.body!.getReader();
      let fullResponse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          totalResponseSize += value.byteLength;
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === 'data: [DONE]') {
              console.log('Stream completed');
              continue;
            }
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
                  tokenCount += content.split(/\s+/).length;
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

        const endTime = Date.now();
        const durationInSeconds = (endTime - startTime) / 1000;
        const tokensPerSecond = tokenCount / durationInSeconds;
        console.info(`API Type: ${apiKey.type}`);
        console.info(`Total tokens: ${tokenCount}`);
        console.info(`Total response size: ${totalResponseSize} bytes`);
        console.info(`Duration: ${durationInSeconds.toFixed(2)} seconds`);
        console.info(`Tokens per second: ${tokensPerSecond.toFixed(2)}`);

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}
