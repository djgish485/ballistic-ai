import { useEffect, useRef } from 'react';

export function useStateSize(state: any, label: string = 'State') {
  const prevSize = useRef<number>(0);

  useEffect(() => {
    const newSize = JSON.stringify(state).length;
    const difference = newSize - prevSize.current;
    const formattedSize = (newSize / 1024).toFixed(2);
    const formattedDifference = (difference / 1024).toFixed(2);

    console.log(`${label} size: ${formattedSize} KB (${formattedDifference} KB change)`);

    prevSize.current = newSize;
  }, [state, label]);
}