import { useState, useEffect, useRef, useCallback } from 'react';

export interface AltitudeData {
  currentAltitude: number;
  maxAltitude: number;
  jumpHeight: number;
  isTracking: boolean;
  baselineAltitude: number;
  pressure: number;
}

export function useAltitudeSensor() {
  const [altitudeData, setAltitudeData] = useState<AltitudeData>({
    currentAltitude: 0,
    maxAltitude: 0,
    jumpHeight: 0,
    isTracking: false,
    baselineAltitude: 0,
    pressure: 0,
  });
  
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const baselineRef = useRef<number | null>(null);
  const maxAltRef = useRef<number>(0);
  const isJumping = useRef(false);
  const jumpStartAlt = useRef<number>(0);
  const watchId = useRef<number | null>(null);

  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Fallback: use orientation data combined with timing
    // This is less accurate but works as backup
  }, []);

  // Use Geolocation API for altitude changes
  const handlePosition = useCallback((position: GeolocationPosition) => {
    const altitude = position.coords.altitude;
    if (altitude === null) return;

    const now = Date.now();
    
    // Set baseline on first reading
    if (baselineRef.current === null) {
      baselineRef.current = altitude;
      setAltitudeData(prev => ({
        ...prev,
        baselineAltitude: altitude,
        currentAltitude: altitude,
      }));
      return;
    }

    const heightChange = altitude - baselineRef.current;
    
    // Detect jump (significant upward movement)
    if (heightChange > 0.5 && !isJumping.current) {
      isJumping.current = true;
      jumpStartAlt.current = baselineRef.current;
    }
    
    // Track max altitude during jump
    if (isJumping.current && altitude > maxAltRef.current) {
      maxAltRef.current = altitude;
    }
    
    // Detect landing (return close to baseline)
    if (isJumping.current && Math.abs(heightChange) < 0.3) {
      const jumpHeight = maxAltRef.current - jumpStartAlt.current;
      if (jumpHeight > 0) {
        setAltitudeData(prev => ({
          ...prev,
          jumpHeight: jumpHeight,
          maxAltitude: Math.max(prev.maxAltitude, jumpHeight),
        }));
      }
      isJumping.current = false;
      maxAltRef.current = 0;
    }

    setAltitudeData(prev => ({
      ...prev,
      currentAltitude: altitude,
      isTracking: isJumping.current,
    }));
  }, []);

  const startListening = useCallback(async () => {
    try {
      if ('geolocation' in navigator) {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = navigator.geolocation.watchPosition(
          handlePosition,
          (err) => {
            setError('Ошибка GPS: ' + err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 100,
            timeout: 5000,
          }
        );
        setIsListening(true);
        setError(null);
      } else {
        setError('GPS не поддерживается на этом устройстве');
      }
    } catch (err) {
      setError('Ошибка при подключении к GPS: ' + (err as Error).message);
    }
  }, [handlePosition]);

  const stopListening = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsListening(false);
    baselineRef.current = null;
  }, []);

  const resetBaseline = useCallback(() => {
    baselineRef.current = null;
    maxAltRef.current = 0;
    setAltitudeData(prev => ({
      ...prev,
      maxAltitude: 0,
      jumpHeight: 0,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  return {
    altitudeData,
    isListening,
    error,
    startListening,
    stopListening,
    resetBaseline,
  };
}
