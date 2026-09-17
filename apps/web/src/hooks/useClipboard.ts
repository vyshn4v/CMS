import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseClipboardOptions {
  timeout?: number;
}

export function useClipboard({ timeout = 2000 }: UseClipboardOptions = {}) {
  const [hasCopied, setHasCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setHasCopied(false);
        }, timeout);
        return true;
      } catch (err) {
        console.error('Failed to copy to clipboard', err);
        setHasCopied(false);
        return false;
      }
    },
    [timeout],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { hasCopied, copy };
}
