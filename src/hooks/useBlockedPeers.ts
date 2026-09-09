'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BlockedPeer {
  id: string;
  name: string;
  device?: string;
  blockedAt: number;
}

const STORAGE_KEY = 'zensend_blocked_peers';
const STRIKE_WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_STRIKES_BEFORE_ALERT = 3;

export function useBlockedPeers() {
  const [blockedPeers, setBlockedPeers] = useState<BlockedPeer[]>([]);
  const rejectStrikesRef = useRef<Map<string, number[]>>(new Map());

  // Load from localStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setBlockedPeers(parsed);
          }
        }
      } catch (e) {
        console.error('Error loading blocked peers:', e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save to localStorage whenever blockedPeers changes
  const persistBlockedPeers = useCallback((list: BlockedPeer[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving blocked peers:', e);
    }
  }, []);

  const isBlocked = useCallback((peerId: string) => {
    return blockedPeers.some(p => p.id === peerId);
  }, [blockedPeers]);

  const blockPeer = useCallback((peer: { id: string; name: string; device?: string }) => {
    setBlockedPeers(prev => {
      if (prev.some(p => p.id === peer.id)) return prev;
      const updated = [
        ...prev,
        {
          id: peer.id,
          name: peer.name || 'อุปกรณ์ไม่ทราบชื่อ',
          device: peer.device,
          blockedAt: Date.now(),
        }
      ];
      persistBlockedPeers(updated);
      return updated;
    });
  }, [persistBlockedPeers]);

  const unblockPeer = useCallback((peerId: string) => {
    setBlockedPeers(prev => {
      const updated = prev.filter(p => p.id !== peerId);
      persistBlockedPeers(updated);
      return updated;
    });
  }, [persistBlockedPeers]);

  // Deprecated auto-block: only manual block is permitted now
  const recordRejection = useCallback((_peerId: string): { isSpamming: boolean; strikeCount: number } => {
    return {
      isSpamming: false,
      strikeCount: 0,
    };
  }, []);

  return {
    blockedPeers,
    isBlocked,
    blockPeer,
    unblockPeer,
    recordRejection,
  };
}
