// Network Quality Detection
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor';

interface NetworkStats {
  rtt: number; // Round-trip time in ms
  downlink: number; // Mbps
  effectiveType: string;
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    rtt?: number;
    downlink?: number;
    effectiveType?: string;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
  mozConnection?: {
    rtt?: number;
    downlink?: number;
    effectiveType?: string;
  };
  webkitConnection?: {
    rtt?: number;
    downlink?: number;
    effectiveType?: string;
  };
}

/**
 * Detect network quality by measuring RTT to server
 */
export async function detectNetworkQuality(): Promise<NetworkQuality> {
  // 1. Try Navigator Network Information API if available (0 network overhead)
  if (typeof navigator !== 'undefined') {
    const nav = navigator as NavigatorWithConnection;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn?.rtt && conn.rtt > 0) {
      if (conn.rtt < 80) return 'excellent';
      if (conn.rtt < 200) return 'good';
      if (conn.rtt < 400) return 'fair';
      return 'poor';
    }
  }

  // 2. Measure RTT with /health
  try {
    const startTime = Date.now();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;

    const response = await fetch('/health', { 
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);
    if (!response.ok) return 'good';
    
    const rtt = Date.now() - startTime;
    
    if (rtt < 80) return 'excellent';
    if (rtt < 200) return 'good';
    if (rtt < 400) return 'fair';
    return 'poor';
  } catch {
    // Graceful fallback without console.error to avoid dev error overlays
    return 'good';
  }
}

export function getNetworkStats(): NetworkStats | null {
  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  
  if (!connection) return null;
  
  return {
    rtt: connection.rtt || 0,
    downlink: connection.downlink || 0,
    effectiveType: connection.effectiveType || 'unknown',
  };
}

/**
 * Determine if should use P2P based on network quality
 */
export function shouldUseP2PBasedOnQuality(quality: NetworkQuality): boolean {
  // P2P requires good network
  return quality === 'excellent' || quality === 'good';
}

/**
 * Get recommended transfer method based on network
 */
export function getRecommendedTransferMethod(
  quality: NetworkQuality,
  fileSize: number
): 'p2p' | 'relay' | 'hybrid' {
  // Small files - always try P2P
  if (fileSize < 5 * 1024 * 1024) {
    return 'p2p';
  }
  
  // Large files - depends on quality
  if (fileSize > 50 * 1024 * 1024) {
    if (quality === 'excellent') return 'p2p';
    if (quality === 'good') return 'hybrid'; // Try P2P, fallback to relay
    return 'relay';
  }
  
  // Medium files
  if (quality === 'excellent' || quality === 'good') return 'p2p';
  if (quality === 'fair') return 'hybrid';
  return 'relay';
}

export function monitorNetworkQuality(
  onQualityChange: (quality: NetworkQuality) => void
): () => void {
  let currentQuality: NetworkQuality = 'good';
  
  const checkQuality = async () => {
    const quality = await detectNetworkQuality();
    if (quality !== currentQuality) {
      currentQuality = quality;
      onQualityChange(quality);
    }
  };
  
  // Check every 30 seconds
  const intervalId = setInterval(checkQuality, 30000);
  
  // Initial check
  checkQuality();
  
  // Listen to connection changes
  const connection = (navigator as NavigatorWithConnection).connection;
  if (connection && typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', checkQuality);
  }
  
  // Cleanup function
  return () => {
    clearInterval(intervalId);
    if (connection && typeof connection.removeEventListener === 'function') {
      connection.removeEventListener('change', checkQuality);
    }
  };
}

/**
 * Get network quality indicator color
 */
export function getQualityColor(quality: NetworkQuality): string {
  const colors = {
    excellent: '#10b981',
    good: '#3b82f6',
    fair: '#f59e0b',
    poor: '#ef4444',
  };
  return colors[quality];
}

/**
 * Get network quality label
 */
export function getQualityLabel(quality: NetworkQuality): string {
  const labels = {
    excellent: 'ยอดเยี่ยม',
    good: 'ดี',
    fair: 'พอใช้',
    poor: 'อ่อน',
  };
  return labels[quality];
}

/**
 * Estimate transfer time based on network quality
 */
export function estimateTransferTime(
  fileSize: number,
  quality: NetworkQuality,
  method: 'p2p' | 'relay'
): number {
  // Speed estimates in MB/s
  const speeds = {
    p2p: {
      excellent: 10,
      good: 5,
      fair: 2,
      poor: 0.5,
    },
    relay: {
      excellent: 3,
      good: 2,
      fair: 1,
      poor: 0.3,
    },
  };
  
  const speedMBps = speeds[method][quality];
  const fileSizeMB = fileSize / (1024 * 1024);
  
  return Math.ceil(fileSizeMB / speedMBps); // seconds
}
