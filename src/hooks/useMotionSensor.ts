import { useState, useEffect, useRef, useCallback } from 'react';

export interface MotionData {
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  totalAcceleration: number;
  isJumping: boolean;
  maxHeight: number;
  currentJumpHeight: number;
}

export function useMotionSensor() {
  const [motionData, setMotionData] = useState<MotionData>({
    accelerationX: 0,
    accelerationY: 0,
    accelerationZ: 0,
    totalAcceleration: 0,
    isJumping: false,
    maxHeight: 0,
    currentJumpHeight: 0,
  });
  
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const jumpStartTime = useRef<number | null>(null);
  const peakAcceleration = useRef<number>(0);
  const isJumping = useRef(false);
  const animationFrame = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const ax = acc.x || 0;
    const ay = acc.y || 0;
    const az = acc.z || 0;
    
    // Total acceleration magnitude (subtract gravity ~9.81)
    const totalAcc = Math.sqrt(ax * ax + ay * ay + az * az);
    const netAcc = Math.abs(totalAcc - 9.81);
    
    const now = Date.now();
    
    // Detect jump start (sudden upward acceleration)
    if (!isJumping.current && netAcc > 15 && az > 12) {
      isJumping.current = true;
      jumpStartTime.current = now;
      peakAcceleration.current = netAcc;
    }
    
    // Track peak during jump
    if (isJumping.current && netAcc > peakAcceleration.current) {
      peakAcceleration.current = netAcc;
    }
    
    // Detect landing (return to normal acceleration)
    if (isJumping.current && netAcc < 3 && jumpStartTime.current) {
      const jumpDuration = (now - jumpStartTime.current) / 1000; // seconds
      
      // Calculate height using physics: h = 0.5 * g * (t/2)^2
      // where t is total air time (up + down)
      const g = 9.81;
      const halfTime = jumpDuration / 2;
      const height = 0.5 * g * halfTime * halfTime;
      
      // Also estimate from peak acceleration
      // Using impulse-momentum: v = a * t, h = v^2 / (2g)
      const estimatedV = peakAcceleration.current * 0.05; // rough impulse duration
      const heightFromAcc = (estimatedV * estimatedV) / (2 * g);
      
      // Use the more reliable measurement (air time based)
      const finalHeight = Math.max(height, heightFromAcc);
      
      if (finalHeight > 0.1 && finalHeight < 50) { // reasonable jump height range
        setMotionData(prev => ({
          ...prev,
          currentJumpHeight: finalHeight,
          maxHeight: Math.max(prev.maxHeight, finalHeight),
          isJumping: false,
        }));
      }
      
      isJumping.current = false;
      jumpStartTime.current = null;
      peakAcceleration.current = 0;
    }
    
    // Throttle updates to ~30fps
    if (now - lastUpdate.current > 33) {
      lastUpdate.current = now;
      setMotionData(prev => ({
        ...prev,
        accelerationX: ax,
        accelerationY: ay,
        accelerationZ: az,
        totalAcceleration: totalAcc,
        isJumping: isJumping.current,
      }));
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined') {
        // Check if we need permission (iOS 13+)
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission !== 'granted') {
            setError('Доступ к датчикам движения запрещён');
            return;
          }
        }
        
        window.addEventListener('devicemotion', handleMotion);
        setIsListening(true);
        setError(null);
      } else {
        setError('Датчики движения не поддерживаются на этом устройстве');
      }
    } catch (err) {
      setError('Ошибка при подключении к датчикам: ' + (err as Error).message);
    }
  }, [handleMotion]);

  const stopListening = useCallback(() => {
    window.removeEventListener('devicemotion', handleMotion);
    setIsListening(false);
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
  }, [handleMotion]);

  const resetMaxHeight = useCallback(() => {
    setMotionData(prev => ({ ...prev, maxHeight: 0 }));
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [handleMotion]);

  return {
    motionData,
    isListening,
    error,
    startListening,
    stopListening,
    resetMaxHeight,
  };
}
