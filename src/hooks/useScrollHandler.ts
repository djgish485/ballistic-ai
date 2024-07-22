import { useState, useEffect, useRef, useCallback } from 'react';

export function useScrollHandler() {
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const lastScrollTop = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    const isScrollingDown = scrollTop > lastScrollTop.current;
    const isScrolledToBottom = scrollTop + windowHeight >= documentHeight - 5;
    
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

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return { userScrolledUp, chatEndRef, scrollToBottom };
}
