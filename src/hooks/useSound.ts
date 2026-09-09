'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from '@/lib/audio/engine';
import type { SoundType } from '@/lib/audio/types';

export type { SoundType } from '@/lib/audio/types';

const SETTINGS_EVENT = 'zensend:sound-settings';
const readSettings = () => {
  if (typeof window === 'undefined') return { muted: false };
  return {
    muted: (localStorage.getItem('zensend_muted') ?? localStorage.getItem('critters_muted')) === 'true',
  };
};

export function useSound() {
  const [settings, setSettings] = useState(() => ({ muted: false }));
  const settingsRef = useRef(settings);

  useEffect(() => {
    const sync = () => setSettings(readSettings());
    sync();
    window.addEventListener(SETTINGS_EVENT, sync);
    const unlock = () => soundEngine.unlock();
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const persist = useCallback((next: typeof settings) => {
    settingsRef.current = next;
    setSettings(next);
    localStorage.setItem('zensend_muted', String(next.muted));
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }, []);

  const toggle = useCallback(() => persist({ ...settingsRef.current, muted: !settingsRef.current.muted }), [persist]);
  const play = useCallback((type: SoundType) => {
    const current = settingsRef.current;
    if (!current.muted) soundEngine.play(type);
  }, []);

  const vibratePattern = useCallback((type: 'tap' | 'select' | 'success' | 'error' | 'progress' | 'milestone' | 'complete' | 'sending') => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    const patterns: Record<string, number | number[]> = { tap: 10, select: [10, 20, 10], success: [40, 40, 80], error: [80, 40, 80], progress: 5, milestone: [20, 20, 20], complete: [40, 20, 60], sending: [10, 30, 10] };
    navigator.vibrate(patterns[type] ?? 10);
  }, []);

  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  }, []);

  return { ...settings, toggle, play, vibrate, vibratePattern };
}
