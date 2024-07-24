import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import DiffScreen from './DiffScreen';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isComplete: boolean;
}

interface SystemMessage {
  type: string;
  content: string;
}

interface ChatInterfaceProps {
  projectDir: string;
  isStarted: boolean;
  hasBackup: boolean;
  onStart: () => void;
  onRestore: () => void;
  systemMessages: SystemMessage[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  projectDir, 
  isStarted, 
  hasBackup, 
  onStart, 
  onRestore, 
  systemMessages 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastScrollTop = useRef(0);
  const [showDiff, setShowDiff] = useState(false);
  const [diffCommand, setDiffCommand] = useState('');

  useEffect(() => {
    console.log('ChatInterface: Props updated', { projectDir, isStarted, hasBackup, systemMessages });
  }, [projectDir, isStarted, hasBackup, systemMessages]);

  useEffect(() => {
    if (isStarted && messages.length === 0) {
      console.log('ChatInterface: Project started, initiating chat');
      initiateChat();
    }
  }, [isStarted, messages.length]);

  const initiateChat = async () => {
    console.log('ChatInterface: Initiating chat');
    setIsLoading(true);
    setIsAIResponding(true);

    try {
      console.log('ChatInterface: Sending initial chat request');
      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectDir, 
          isInitial: true, 
          conversationHistory: [],
          selectedAPIKeyIndex: sessionStorage.getItem('selectedAPIKeyIndex')
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('ChatInterface: Initial chat response received');
      await processStreamResponse(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('ChatInterface: Request was cancelled');
      } else {
        console.error('ChatInterface: Error starting chat:', error);
      }
    } finally {
      setIsLoading(false);
      setIsAIResponding(false);
      abortControllerRef.current = null;
    }
  };

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    const isScrollingDown = scrollTop > lastScrollTop.current;
    const isScrolledToBottom = scrollTop + windowHeight >= documentHeight - 7;
    
    setUserScrolledUp(!isScrolledToBottom);
    lastScrollTop.current = scrollTop;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setUserScrolledUp(false);
        }
      },
      { threshold: 0.1 }
    );

    if (chatEndRef.current) {
      observer.observe(chatEndRef.current);
    }

    return () => {
      if (chatEndRef.current) {
        observer.unobserve(chatEndRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom();
    }
  }, [messages, systemMessages, userScrolledUp, scrollToBottom]);

  const processStreamResponse = async (response: Response) => {
    console.log('ChatInterface: Processing stream response');
    if (!response.body) {
      console.error('ChatInterface: No response body');
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let currentContent = '';

    setMessages((prev) => [...prev, { role: 'assistant', content: '', isComplete: false }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              currentContent += data.content;

              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  ...newMessages[newMessages.length - 1],
                  content: currentContent,
                };
                return newMessages;
              });
            } else if (data.conversationHistory) {
              setMessages(data.conversationHistory.map((msg: Message) => ({ ...msg, isComplete: true })));
              return;
            }
          } catch (error) {
            console.error('ChatInterface: Error parsing JSON:', error);
          }
        }
      }
    }
    console.log('ChatInterface: Stream processing completed');
    
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = {
        ...newMessages[newMessages.length - 1],
        isComplete: true,
      };
      return newMessages;
    });
  };

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      console.log('ChatInterface: Sending message:', input);
      const userMessage: Message = { role: 'user', content: input, isComplete: true };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setIsAIResponding(true);

      try {
        abortControllerRef.current = new AbortController();
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectDir, 
            message: input, 
            isInitial: false, 
            conversationHistory: messages,
            selectedAPIKeyIndex: sessionStorage.getItem('selectedAPIKeyIndex')
          }),
          signal: abortControllerRef.current.signal,
        });

        await processStreamResponse(response);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('ChatInterface: Request was cancelled');
        } else {
          console.error('ChatInterface: Error sending message:', error);
        }
      } finally {
        setIsLoading(false);
        setIsAIResponding(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAIResponding(false);
      setIsLoading(false);
    }
  };

  const handleDiff = (command: string) => {
    setDiffCommand(command);
    setShowDiff(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div 
        className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-100 rounded"
        ref={chatContainerRef}
      >
        <ChatMessages 
          systemMessages={systemMessages} 
          messages={messages} 
          onDiff={handleDiff}
        />
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 bg-gray-200 rounded-b">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleCancel={handleCancel}
          isLoading={isLoading}
          isAIResponding={isAIResponding}
        />
      </div>
      {showDiff && (
        <DiffScreen
          command={diffCommand}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
