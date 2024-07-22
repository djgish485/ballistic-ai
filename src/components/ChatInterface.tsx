import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import DiffScreen from './DiffScreen';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SystemMessage {
  type: 'backup' | 'restore';
  content: string;
}

const ChatInterface: React.FC<{ projectDir: string }> = ({ projectDir }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastScrollTop = useRef(0);
  const [showDiff, setShowDiff] = useState(false);
  const [diffFilePath, setDiffFilePath] = useState('');

  const scrollToBottom = useCallback(() => {
    console.log('Attempting to scroll to bottom');
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    console.log('Scroll event detected');
    console.log('windowHeight:', windowHeight);
    console.log('documentHeight:', documentHeight);
    console.log('scrollTop:', scrollTop);
    
    const isScrollingDown = scrollTop > lastScrollTop.current;
    const isScrolledToBottom = scrollTop + windowHeight >= documentHeight - 5;
    
    console.log('Is scrolling down:', isScrollingDown);
    console.log('Is scrolled to bottom:', isScrolledToBottom);
    
    setUserScrolledUp(!isScrolledToBottom);
    lastScrollTop.current = scrollTop;
    
    console.log('userScrolledUp set to:', !isScrolledToBottom);
  }, []);

  useEffect(() => {
    console.log('Setting up scroll event listener on window');
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    console.log('Setting up Intersection Observer');
    const observer = new IntersectionObserver(
      ([entry]) => {
        console.log('Intersection Observer callback triggered');
        console.log('Entry is intersecting:', entry.isIntersecting);
        if (entry.isIntersecting) {
          console.log('Chat end is visible, user has scrolled to bottom');
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
    console.log('Messages updated, current userScrolledUp state:', userScrolledUp);
    if (!userScrolledUp) {
      scrollToBottom();
    }
  }, [messages, userScrolledUp, scrollToBottom]);

  const processStreamResponse = async (response: Response) => {
    console.log('Processing stream response');
    if (!response.body) {
      console.error('No response body');
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let currentContent = '';

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
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1].content = currentContent;
                } else {
                  newMessages.push({ role: 'assistant', content: currentContent });
                }
                return newMessages;
              });
            } else if (data.conversationHistory) {
              setMessages(data.conversationHistory);
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        }
      }
    }
    console.log('Stream processing completed');
  };

  const createBackup = async () => {
    try {
      const response = await fetch('/api/project-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir }),
      });
      const data = await response.json();
      if (response.ok) {
        setHasBackup(true);
        setSystemMessages((prev) => [
          ...prev,
          { type: 'backup', content: 'Project backup created. Previous backup (if any) was overwritten.' },
        ]);
      } else {
        throw new Error(data.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setSystemMessages((prev) => [
        ...prev,
        { type: 'backup', content: `Error creating backup: ${error instanceof Error ? error.message : 'Unknown error'}` },
      ]);
    }
  };

  const handleStart = async () => {
    console.log('Start button clicked');
    setIsStarted(true);
    setMessages([]);
    setIsLoading(true);
    setIsAIResponding(true);

    try {
      await createBackup();

      console.log('Analyzing project');
      const analyzeResponse = await fetch('/api/analyze-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir }),
      });
      const analyzeData = await analyzeResponse.json();
      console.log('Analyze project response:', analyzeData);

      console.log('Starting chat');
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

      await processStreamResponse(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled');
      } else {
        console.error('Error starting chat:', error);
        setMessages([{ role: 'assistant', content: 'An error occurred while starting the chat.' }]);
      }
    } finally {
      setIsLoading(false);
      setIsAIResponding(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      console.log('Sending message:', input);
      const userMessage: Message = { role: 'user', content: input };
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
          console.log('Request was cancelled');
        } else {
          console.error('Error sending message:', error);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: 'An error occurred while processing your message.' },
          ]);
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

  const handleRestore = async () => {
    if (!hasBackup) return;

    const confirmed = window.confirm(
      'Are you sure you want to restore the project to the latest backup? This will replace your current project with the backup.'
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/project-backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages([]);
        setIsStarted(false);
        setHasBackup(false);
        setSystemMessages((prev) => [
          ...prev,
          {
            type: 'restore',
            content: 'Project restored successfully. You can start a new analysis by clicking the "Start" button.',
          },
        ]);
      } else {
        throw new Error(data.error || 'Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setSystemMessages((prev) => [
        ...prev,
        { type: 'restore', content: `Error restoring backup: ${error instanceof Error ? error.message : 'Unknown error'}` },
      ]);
    }
  };

  const handleDiff = (filePath: string) => {
    setDiffFilePath(filePath);
    setShowDiff(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex space-x-2">
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isStarted ? 'Next feature/fix' : 'Start'}
        </button>
        {hasBackup && (
          <button
            onClick={handleRestore}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Undo All & Restore Backup
          </button>
        )}
      </div>
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
        <DiffScreen filePath={diffFilePath} onClose={() => setShowDiff(false)} />
      )}
    </div>
  );
};

export default ChatInterface;