import { useState, useCallback, useRef } from 'react';

export interface JumpRecord {
  id: string;
  height: number;
  timestamp: number;
  duration: number;
  method: 'motion' | 'gps' | 'manual';
}

export interface JumpSession {
  jumps: JumpRecord[];
  maxHeight: number;
  averageHeight: number;
  totalJumps: number;
  startTime: number;
}

export function useJumpTracker() {
  const [session, setSession] = useState<JumpSession>({
    jumps: [],
    maxHeight: 0,
    averageHeight: 0,
    totalJumps: 0,
    startTime: Date.now(),
  });

  const [isSessionActive, setIsSessionActive] = useState(false);
  const jumpCountRef = useRef(0);

  const addJump = useCallback((height: number, duration: number = 0, method: 'motion' | 'gps' | 'manual' = 'motion') => {
    if (height < 0.1) return; // ignore tiny movements

    const newJump: JumpRecord = {
      id: `jump_${Date.now()}_${jumpCountRef.current++}`,
      height: Math.round(height * 100) / 100,
      timestamp: Date.now(),
      duration,
      method,
    };

    setSession(prev => {
      const newJumps = [...prev.jumps, newJump];
      const newMaxHeight = Math.max(prev.maxHeight, newJump.height);
      const newAverage = newJumps.reduce((sum, j) => sum + j.height, 0) / newJumps.length;
      
      return {
        ...prev,
        jumps: newJumps,
        maxHeight: Math.round(newMaxHeight * 100) / 100,
        averageHeight: Math.round(newAverage * 100) / 100,
        totalJumps: newJumps.length,
      };
    });

    return newJump;
  }, []);

  const startSession = useCallback(() => {
    setSession({
      jumps: [],
      maxHeight: 0,
      averageHeight: 0,
      totalJumps: 0,
      startTime: Date.now(),
    });
    setIsSessionActive(true);
    jumpCountRef.current = 0;
  }, []);

  const stopSession = useCallback(() => {
    setIsSessionActive(false);
  }, []);

  const clearSession = useCallback(() => {
    setSession({
      jumps: [],
      maxHeight: 0,
      averageHeight: 0,
      totalJumps: 0,
      startTime: Date.now(),
    });
    jumpCountRef.current = 0;
  }, []);

  return {
    session,
    isSessionActive,
    addJump,
    startSession,
    stopSession,
    clearSession,
  };
}
