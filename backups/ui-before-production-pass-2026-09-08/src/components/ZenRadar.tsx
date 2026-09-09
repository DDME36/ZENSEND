'use client';

import { useEffect, useRef, useState } from 'react';
import { ZenCurvedGrid } from './ZenCurvedGrid';

export type DiscoveryMode = 'public' | 'wifi' | 'private';

interface ZenRadarProps {
  mode?: DiscoveryMode;
}

// ==============================================================================
// ZenRadar - Clean Ambient Background with Floating Orbs & Mode Waves
// Powered by Zentyr
// ==============================================================================

export function ZenRadar({ mode = 'public' }: ZenRadarProps) {
  const [activeRipple, setActiveRipple] = useState<string | null>(null);
  const prevModeRef = useRef(mode);

  useEffect(() => {
    // Only trigger ripple when mode actually changes, never on initial mount or re-mount
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      setActiveRipple(mode);
      const timer = setTimeout(() => {
        setActiveRipple(null);
      }, 3800);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [mode]);

  return (
    <>
      <div className={`zen-bg-viewport mode-${mode}`} data-mode={mode} aria-hidden="true">
        {/* Dynamic Ambient Gradient */}
        <div className="bg-gradient-animated" />

        {/* Spherical Curved Dot Grid with Radial Vignette */}
        <ZenCurvedGrid mode={mode} />

        {/* Battery-Friendly Static Ambient Gradient Mesh for Mobile & Eco Mode */}
        <div className={`zen-eco-mesh mode-${mode}`} />

        {/* Subtle Ambient Floating Glow Orbs with Mode Aura & Pastel Spectrum (Full Desktop/iPad visuals) */}
        <div className="zen-ambient-orbs">
          {/* Dedicated Mode Accent Aura - Reacts specifically to discovery mode */}
          <div className={`zen-orb zen-orb-mode mode-${mode}`} />
          
          {/* Multi-Hue Pastel Spectrum Orbs - Shift gently across the background */}
          <div className="zen-orb zen-orb-pastel-lavender" />
          <div className="zen-orb zen-orb-pastel-peach" />
          <div className="zen-orb zen-orb-pastel-cyan" />
        </div>

        {/* Soft Liquid Water Stream ("ระลอกคลื่นสายน้ำ") Mode Transition - Background Canvas */}
        {activeRipple && (
          <div key={`water-stream-${activeRipple}`} className={`zen-water-stream-canvas mode-${activeRipple}`} aria-hidden="true">
            {/* Ambient Water Tide Wash */}
            <div className="zen-water-ambient-wash" />

            {/* Feathered Liquid Water Waves - Zero Rigid Borders, Soft Refractive Glow */}
            <div className="zen-water-stream-ripple ripple-1" />
            <div className="zen-water-stream-ripple ripple-2" />
            <div className="zen-water-stream-ripple ripple-3" />
          </div>
        )}
      </div>
    </>
  );
}

// Backward compatibility alias
export const Clouds = ZenRadar;

