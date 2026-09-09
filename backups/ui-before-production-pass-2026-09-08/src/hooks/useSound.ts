'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Singleton AudioContext - shared across all hook instances
let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
    }
  }

  return sharedAudioContext;
}

// Unlock audio on first interaction (Crucial for iOS Safari)
function unlockAudio() {
  if (isAudioUnlocked || typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Play a silent short buffer
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  isAudioUnlocked = true;
  
  // Cleanup listeners
  ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(e => 
    window.removeEventListener(e, unlockAudio)
  );
}

if (typeof window !== 'undefined') {
  ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(e => 
    window.addEventListener(e, unlockAudio, { once: true, passive: true })
  );
}

export type SoundType =
  | 'tick'
  | 'tap'
  | 'modeSwitch'
  | 'modePublic'
  | 'modeWifi'
  | 'modePrivate'
  | 'toggleOn'
  | 'toggleOff'
  | 'openModal'
  | 'closeModal'
  | 'selectPeer'
  | 'copy'
  | 'connect'
  | 'whoosh'
  | 'sending'
  | 'success'
  | 'complete'
  | 'notification'
  | 'reject'
  | 'block'
  | 'drop'
  | 'progress25'
  | 'progress50'
  | 'progress75';

export function useSound() {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);

  useEffect(() => {
    setTimeout(() => {
      const isMuted = (localStorage.getItem('zensend_muted') || localStorage.getItem('critters_muted')) === 'true';
      setMuted(isMuted);
    }, 0);
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);


  const toggle = useCallback(() => {
    setMuted(prev => {
      const newVal = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('zensend_muted', String(newVal));
      }
      return newVal;
    });
  }, []);

  const play = useCallback((type: SoundType) => {
    if (mutedRef.current) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // 1. Tactile Micro-Click (Ultra-crisp modern hardware tap)
      if (type === 'tap' || type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1850, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.012);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.065, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.015);
        return;
      }

      // 2. Toggle On (Bright ascending dual-pip)
      if (type === 'toggleOn') {
        const notes = [659.25, 987.77]; // E5 -> B5
        notes.forEach((freq, idx) => {
          const t = now + idx * 0.045;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.055, t + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.065);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.07);
        });
        return;
      }

      // 3. Toggle Off (Soft descending dual-pip)
      if (type === 'toggleOff') {
        const notes = [880.00, 587.33]; // A5 -> D5
        notes.forEach((freq, idx) => {
          const t = now + idx * 0.045;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.045, t + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.065);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.07);
        });
        return;
      }

      // 4. Mode Switch: Public Mode (Zen Emerald Serenity - Pure open resonant harmonic chord)
      if (type === 'modePublic') {
        const chord = [587.33, 880.00]; // D5, A5 (Serene fifth)
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(freq * 2.5, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.07, now + 0.02 + idx * 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.45);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.45);
        });
        return;
      }

      // 5. Mode Switch: WiFi Mode (Sky Cyan Tech - Crisp harmonic ping)
      if (type === 'modeWifi') {
        const notes = [523.25, 1046.50]; // C5, C6
        notes.forEach((freq, idx) => {
          const t = now + idx * 0.035;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.04, t + 0.05);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.065, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.38);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.38);
        });
        return;
      }

      // 6. Mode Switch: Private Mode (Amethyst Purple - Warm velvet confidential resonance)
      if (type === 'modePrivate') {
        const chord = [440.00, 659.25]; // A4, E5
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(900, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.50);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.50);
        });
        return;
      }

      // 7. General Mode Switch / Liquid Wave Resonance
      if (type === 'modeSwitch' || type === 'drop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.25);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        return;
      }

      // 8. Open Modal / Dropdown Expand (Velvet airy sheet bloom)
      if (type === 'openModal') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.12);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(2200, now + 0.10);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.16);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
        return;
      }

      // 9. Close Modal / Dismiss (Gentle tuck-in thud)
      if (type === 'closeModal') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.085);
        return;
      }

      // 10. Select Peer (Magnetic Lock-In Ping)
      if (type === 'selectPeer') {
        const chord = [880.00, 1320.00]; // A5, E6
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.02);

          gain.gain.setValueAtTime(0, now + idx * 0.02);
          gain.gain.linearRampToValueAtTime(0.065, now + idx * 0.02 + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.02 + 0.14);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.02);
          osc.stop(now + idx * 0.02 + 0.14);
        });
        return;
      }

      // 11. Copy Code / Text (Crisp tactile double snap)
      if (type === 'copy') {
        [0, 0.038].forEach(delay => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(2600, now + delay);
          osc.frequency.exponentialRampToValueAtTime(800, now + delay + 0.01);

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.05, now + delay + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + delay + 0.018);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + delay);
          osc.stop(now + delay + 0.02);
        });
        return;
      }

      // 12. Block Peer (Firm mechanical lock latch)
      if (type === 'block') {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(240, now);
        osc1.frequency.exponentialRampToValueAtTime(85, now + 0.08);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.08, now + 0.004);
        gain1.gain.exponentialRampToValueAtTime(0.0005, now + 0.09);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.09);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1400, now + 0.035);
        osc2.frequency.exponentialRampToValueAtTime(450, now + 0.035 + 0.02);

        gain2.gain.setValueAtTime(0, now + 0.035);
        gain2.gain.linearRampToValueAtTime(0.06, now + 0.035 + 0.003);
        gain2.gain.exponentialRampToValueAtTime(0.0005, now + 0.035 + 0.035);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.035);
        osc2.stop(now + 0.035 + 0.04);
        return;
      }

      // 13. Incoming File / Text Notification (Soft acoustic marimba chime)
      if (type === 'notification') {
        const chimeNotes = [659.25, 987.77]; // E5 -> B5
        chimeNotes.forEach((freq, idx) => {
          const startTime = now + idx * 0.12;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const overtone = ctx.createOscillator();
          const overtoneGain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.08, startTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);

          overtone.type = 'triangle';
          overtone.frequency.setValueAtTime(freq * 2.01, startTime);
          overtoneGain.gain.setValueAtTime(0, startTime);
          overtoneGain.gain.linearRampToValueAtTime(0.02, startTime + 0.01);
          overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

          osc.connect(gain);
          gain.connect(ctx.destination);
          overtone.connect(overtoneGain);
          overtoneGain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.55);
          overtone.start(startTime);
          overtone.stop(startTime + 0.3);
        });
        return;
      }

      // 14. Success / Complete (Pristine celestial bell chord arpeggio)
      if (type === 'success' || type === 'complete') {
        const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Major Triad Arpeggio)
        chord.forEach((freq, idx) => {
          const noteStart = now + idx * 0.075;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteStart);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(freq * 3, noteStart);

          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(0.07, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0005, noteStart + 0.7);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + 0.7);
        });
        return;
      }

      // 15. Air Whoosh / Sending (Fluid aerodynamic breeze slide)
      if (type === 'whoosh' || type === 'sending') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.28);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(320, now);
        filter.frequency.exponentialRampToValueAtTime(1100, now + 0.2);
        filter.Q.setValueAtTime(2, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.32);
        return;
      }

      // 16. Reject / Decline (Soft, polite double low-tap)
      if (type === 'reject') {
        [0, 0.09].forEach(delay => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(160, now + delay);
          osc.frequency.exponentialRampToValueAtTime(80, now + delay + 0.06);

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.06, now + delay + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.07);
        });
        return;
      }

      // 17. Connect / Peer Joined (Gentle subtle bubble chime)
      if (type === 'connect') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        return;
      }

      // 18. Progress Milestones
      if (type.startsWith('progress')) {
        const freqs = { progress25: 523.25, progress50: 659.25, progress75: 783.99 };
        const f = freqs[type as keyof typeof freqs] || 523.25;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        return;
      }
    } catch (e) {
      console.error('Audio error:', e);
    }
  }, []);

  const vibratePattern = useCallback((type: 'tap' | 'select' | 'success' | 'error' | 'progress' | 'milestone' | 'complete' | 'sending') => {
    if (!('vibrate' in navigator)) return;

    const patterns: Record<string, number | number[]> = {
      tap: 10,
      select: [10, 20, 10],
      success: [40, 40, 80],
      error: [80, 40, 80, 40, 80],
      progress: 5,
      milestone: [20, 20, 20],
      complete: [40, 20, 40, 20, 60],
      sending: [10, 30, 10, 30, 10],
    };

    navigator.vibrate(patterns[type] || 10);
  }, []);

  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }, []);

  return { muted, toggle, play, vibrate, vibratePattern };
}
