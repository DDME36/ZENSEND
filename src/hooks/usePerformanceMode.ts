'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type EcoPreference = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'zensend_eco_mode';

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener(type: 'chargingchange' | 'levelchange', listener: EventListener): void;
  removeEventListener(type: 'chargingchange' | 'levelchange', listener: EventListener): void;
}

function getInitialEcoPreference(): EcoPreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as EcoPreference | null;
    if (saved === 'auto' || saved === 'on' || saved === 'off') {
      return saved;
    }
  } catch {}
  return 'auto';
}

export function usePerformanceMode(hasActiveTransfer = false) {
  const [ecoPreference, setEcoPreferenceState] = useState<EcoPreference>('auto');
  const [isEcoMode, setIsEcoMode] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine active eco state based on preference and device characteristics
  const computeIsEco = useCallback((pref: EcoPreference, isLowBattery = false): boolean => {
    if (pref === 'on') return true;
    if (pref === 'off') return false;

    // 'auto' mode:
    if (typeof window === 'undefined') return false;

    // Battery saver when unplugged & low battery
    if (isLowBattery) {
      return true;
    }

    // Only automatically enable Eco mode if low battery or user requested reduced motion.
    // Modern devices (including iPhone and Android) run full smooth visuals.
    return false;
  }, []);

  // Update preference handler
  const setEcoPreference = useCallback((newPref: EcoPreference) => {
    setEcoPreferenceState(newPref);
    try {
      localStorage.setItem(STORAGE_KEY, newPref);
    } catch {}
    const active = computeIsEco(newPref);
    setIsEcoMode(active);
    document.documentElement.setAttribute('data-eco-mode', active ? 'true' : 'false');
  }, [computeIsEco]);

  // Toggle helper: cycles between 'on' and 'off'
  const toggleEcoMode = useCallback(() => {
    setEcoPreference(isEcoMode ? 'off' : 'on');
  }, [isEcoMode, setEcoPreference]);

  // Synchronize state after initial hydration to prevent SSR mismatch
  useEffect(() => {
    const savedPref = getInitialEcoPreference();
    const domAttr = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-eco-mode') : null;
    const active = domAttr !== null ? domAttr === 'true' : computeIsEco(savedPref);

    const timer = setTimeout(() => {
      if (savedPref !== 'auto') {
        setEcoPreferenceState(savedPref);
      }
      setIsEcoMode(active);
      document.documentElement.setAttribute('data-eco-mode', active ? 'true' : 'false');
    }, 0);

    return () => clearTimeout(timer);
  }, [computeIsEco]);

  // Battery API subscription
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let batteryCleanup: (() => void) | undefined;
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };

    if (typeof nav.getBattery === 'function') {
      nav.getBattery().then((battery) => {
        const updateBattery = () => {
          const isLow = !battery.charging && battery.level <= 0.2;
          const currentPref = (localStorage.getItem(STORAGE_KEY) as EcoPreference) || 'auto';
          if (currentPref === 'auto') {
            const nextEco = computeIsEco('auto', isLow);
            setIsEcoMode(nextEco);
            document.documentElement.setAttribute('data-eco-mode', nextEco ? 'true' : 'false');
          }
        };

        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        batteryCleanup = () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      }).catch(() => {
        // Battery API disallowed or rejected
      });
    }

    return () => {
      if (batteryCleanup) batteryCleanup();
    };
  }, [computeIsEco]);

  // Page Visibility Defense: Pause animations 100% when tab is hidden or screen locked
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => {
      if (document.hidden) {
        document.documentElement.setAttribute('data-page-hidden', 'true');
      } else {
        document.documentElement.removeAttribute('data-page-hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.documentElement.removeAttribute('data-page-hidden');
    };
  }, []);

  // Idle Standby Cooling: Throttle animations when user rests phone on desk without activity for 45s
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resetIdle = () => {
      document.documentElement.removeAttribute('data-idle');
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      // Do not enter idle if a file transfer is actively in progress
      if (!hasActiveTransfer) {
        idleTimerRef.current = setTimeout(() => {
          document.documentElement.setAttribute('data-idle', 'true');
        }, 45000);
      }
    };

    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, resetIdle, { passive: true }));
    resetIdle();

    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetIdle));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      document.documentElement.removeAttribute('data-idle');
    };
  }, [hasActiveTransfer]);

  return {
    isEcoMode,
    ecoPreference,
    setEcoPreference,
    toggleEcoMode,
  };
}
