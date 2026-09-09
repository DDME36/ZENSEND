'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

interface ZenIntroSplashProps {
  onComplete: () => void;
  /** Callback fired immediately when the splash starts dissolving */
  onStartExit?: () => void;
  /** Maximum duration in ms before auto-transitioning (default: 2300ms) */
  autoAdvanceDelay?: number;
}

const BRAND_NAME = 'ZenSend';
const ZEN_PART = 'Zen';
const SEND_PART = 'Send';

export function ZenIntroSplash({ onComplete, onStartExit, autoAdvanceDelay = 2700 }: ZenIntroSplashProps) {
  const [typedCount, setTypedCount] = useState(0);
  const [showSparkle, setShowSparkle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const completedRef = useRef(false);
  const exitStartedRef = useRef(false);
  const startTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const exitFinishRef = useRef<NodeJS.Timeout | null>(null);
  const hardSafetyRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all timers safely
  const clearAllTimers = useCallback(() => {
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (exitFinishRef.current) clearTimeout(exitFinishRef.current);
    if (hardSafetyRef.current) clearTimeout(hardSafetyRef.current);
  }, []);

  const finishExit = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearAllTimers();
    onComplete();
  }, [clearAllTimers, onComplete]);

  const triggerComplete = useCallback(() => {
    if (exitStartedRef.current || completedRef.current) return;
    exitStartedRef.current = true;
    clearAllTimers();
    setIsExiting(true);
    onStartExit?.();
    // Transition completion is primary; the timer covers background tabs.
    exitFinishRef.current = setTimeout(finishExit, 650);
  }, [onStartExit, clearAllTimers, finishExit]);

  // Handle tap / click anywhere to skip immediately
  const handleSkip = useCallback(() => {
    triggerComplete();
  }, [triggerComplete]);

  // Keyboard shortcut to skip (Enter, Space, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  // Typewriting effect sequence with ironclad timer lifecycle
  useEffect(() => {
    // Stage 1: Brief pause before typing starts (220ms)
    startTimerRef.current = setTimeout(() => {
      let current = 0;
      typingIntervalRef.current = setInterval(() => {
        current += 1;
        setTypedCount(current);
        if (current >= BRAND_NAME.length) {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
          setShowSparkle(true);
          setShowSubtitle(true);
        }
      }, 65);
    }, 220);

    // Stage 2: Normal auto-advance timer
    autoAdvanceRef.current = setTimeout(() => {
      triggerComplete();
    }, autoAdvanceDelay);

    // Stage 3: Hard failsafe ceiling (3000ms max) - guarantees splash NEVER traps user
    hardSafetyRef.current = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, Math.max(autoAdvanceDelay + 700, 3000));

    return () => {
      clearAllTimers();
    };
  }, [autoAdvanceDelay, triggerComplete, clearAllTimers, onComplete]);

  // Split typed string into Zen (primary) and Send (cyan/indigo gradient)
  const typedZen = ZEN_PART.slice(0, Math.min(typedCount, ZEN_PART.length));
  const typedSend = typedCount > ZEN_PART.length
    ? SEND_PART.slice(0, typedCount - ZEN_PART.length)
    : '';
  const isTypingDone = typedCount >= BRAND_NAME.length;

  return (
    <div
      className={`zen-intro-splash ${isExiting ? 'splash-exiting' : 'splash-entering'}`}
      onClick={handleSkip}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === 'opacity' && isExiting) finishExit();
      }}
      role="region"
      aria-label="ZenSend Intro"
      tabIndex={0}
    >
      <div className="zen-intro-center-stage">
        {/* Ambient Pegasus Icon with Pulse Glow & Active Flight */}
        <div className={`zen-intro-logo-wrap ${showSparkle ? 'pegasus-celebrating' : ''}`}>
          {/* Luminous Pulsing Aurora Glow */}
          <div className="zen-intro-logo-glow" aria-hidden="true" />

          {/* Floating Starlight Sparkles */}
          <div className="zen-intro-stars-field" aria-hidden="true">
            <span className="intro-star intro-star-1">✦</span>
            <span className="intro-star intro-star-2">✧</span>
            <span className="intro-star intro-star-3">⋆</span>
            <span className="intro-star intro-star-4">✦</span>
          </div>

          {/* Hero Pegasus with Smooth Harmonic Flight */}
          <div className="zen-intro-horse-container">
            <Image
              className="zen-intro-horse"
              src="/zensend-z-horse.png"
              alt="ZenSend Pegasus"
              width={82}
              height={82}
              priority
            />
          </div>
        </div>

        {/* Typewriting Brand Typography */}
        <div className="zen-intro-brand-row">
          <h1 className="zen-intro-brand-heading">
            <span className="zen-intro-zen">{typedZen}</span>
            <span className="zen-intro-send">
              {typedSend}
              <span className={`zen-intro-sparkle ${showSparkle ? 'visible' : ''}`} aria-hidden="true">✦</span>
            </span>
            {!isTypingDone && <span className="zen-intro-cursor" aria-hidden="true" />}
          </h1>
        </div>

        {/* Elegant Minimalist Slogan */}
        <div className={`zen-intro-sub-wrap ${showSubtitle ? 'visible' : ''}`}>
          <p className="zen-intro-slogan">Fast, Direct &amp; Private</p>
          <span className="zen-intro-pill-note">ส่งไฟล์ไร้สาย รวดเร็ว และเป็นส่วนตัว</span>
        </div>
      </div>

      {/* Subtle Skip Affordance at bottom */}
      <div className="zen-intro-skip-hint visible">
        <span>แตะที่ใดก็ได้เพื่อข้าม</span>
      </div>
    </div>
  );
}
