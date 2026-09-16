'use client';

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Initialize theme from DOM attribute or localStorage immediately on mount
  useEffect(() => {
    const currentDomTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
    const saved = localStorage.getItem('zensend_theme') as Theme | null;
    
    if (saved || currentDomTheme) {
      setTimeout(() => {
        if (saved) setThemeState(saved);
        if (currentDomTheme) setResolvedTheme(currentDomTheme);
      }, 0);
    }
  }, []);

  // Listen for system color-scheme changes if theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const next = e.matches ? 'dark' : 'light';
      setResolvedTheme(next);
      document.documentElement.setAttribute('data-theme', next);
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', next === 'dark' ? '#090d16' : '#ffffff');
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('zensend_theme', newTheme);
    
    // Resolve immediately and apply to DOM synchronously in 0ms
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const nextResolved = newTheme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : newTheme;
    setResolvedTheme(nextResolved);
    document.documentElement.setAttribute('data-theme', nextResolved);
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', nextResolved === 'dark' ? '#090d16' : '#ffffff');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}
