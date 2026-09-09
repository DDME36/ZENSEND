export interface LimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

export class SlidingWindowLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly maximum: number,
    private readonly windowMs: number,
  ) {}

  attempt(key: string, now = Date.now()): LimitDecision {
    const cutoff = now - this.windowMs;
    const recent = (this.attempts.get(key) ?? []).filter(timestamp => timestamp > cutoff);

    if (recent.length >= this.maximum) {
      this.attempts.set(key, recent);
      return {
        allowed: false,
        retryAfterMs: Math.max(1, recent[0] + this.windowMs - now),
      };
    }

    recent.push(now);
    this.attempts.set(key, recent);
    return { allowed: true, retryAfterMs: 0 };
  }

  prune(now = Date.now()): void {
    const cutoff = now - this.windowMs;
    for (const [key, timestamps] of this.attempts) {
      const recent = timestamps.filter(timestamp => timestamp > cutoff);
      if (recent.length === 0) this.attempts.delete(key);
      else this.attempts.set(key, recent);
    }
  }
}

export const blockKey = (ownerPeerId: string, blockedPeerId: string): string =>
  `${ownerPeerId}\u0000${blockedPeerId}`;

export const isBlocked = (
  blockedPairs: ReadonlySet<string>,
  ownerPeerId: string,
  blockedPeerId: string,
): boolean => blockedPairs.has(blockKey(ownerPeerId, blockedPeerId));

