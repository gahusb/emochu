'use client';

import { useState, useCallback } from 'react';

export interface ActiveStopState {
  activeIndex: number | null;
  setActive: (index: number | null) => void;
  toggleActive: (index: number) => void;
}

export function useActiveStop(): ActiveStopState {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const setActive = useCallback((index: number | null) => {
    setActiveIndex(index);
  }, []);

  const toggleActive = useCallback((index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  }, []);

  return { activeIndex, setActive, toggleActive };
}
