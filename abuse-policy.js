"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBlocked = exports.blockKey = exports.SlidingWindowLimiter = void 0;
class SlidingWindowLimiter {
    maximum;
    windowMs;
    attempts = new Map();
    constructor(maximum, windowMs) {
        this.maximum = maximum;
        this.windowMs = windowMs;
    }
    attempt(key, now = Date.now()) {
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
    prune(now = Date.now()) {
        const cutoff = now - this.windowMs;
        for (const [key, timestamps] of this.attempts) {
            const recent = timestamps.filter(timestamp => timestamp > cutoff);
            if (recent.length === 0)
                this.attempts.delete(key);
            else
                this.attempts.set(key, recent);
        }
    }
}
exports.SlidingWindowLimiter = SlidingWindowLimiter;
const blockKey = (ownerPeerId, blockedPeerId) => `${ownerPeerId}\u0000${blockedPeerId}`;
exports.blockKey = blockKey;
const isBlocked = (blockedPairs, ownerPeerId, blockedPeerId) => blockedPairs.has((0, exports.blockKey)(ownerPeerId, blockedPeerId));
exports.isBlocked = isBlocked;
