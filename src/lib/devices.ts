// ==============================================================================
// ZenSend - Device Identification & Peer Identity Standards
// Powered by Zentyr
// ==============================================================================

export const DEVICE_PROFILES = {
  ios: { type: 'apple', color: '#38bdf8', emoji: '📱', name: 'iPhone' },
  macos: { type: 'apple', color: '#818cf8', emoji: '💻', name: 'MacBook' },
  ipados: { type: 'apple', color: '#a78bfa', emoji: '📲', name: 'iPad' },
  windows: { type: 'windows', color: '#06b6d4', emoji: '🖥️', name: 'Windows' },
  android: { type: 'android', color: '#10b981', emoji: '📱', name: 'Android' },
  linux: { type: 'linux', color: '#f59e0b', emoji: '🐧', name: 'Linux' },
  unknown: { type: 'device', color: '#6366f1', emoji: '💻', name: 'Device' },
} as const;

export type OSType = keyof typeof DEVICE_PROFILES;

export interface DeviceInfo {
  type: string;
  name?: string;
  color: string;
  emoji: string;
  os: OSType;
  photoUrl?: string | null;
}

// Backward compatibility alias
export type CritterInfo = DeviceInfo;
export const CRITTERS = DEVICE_PROFILES;

export interface Peer {
  id: string;
  tabId?: string;
  name: string;
  device: string;
  avatar?: DeviceInfo;
  critter: DeviceInfo;
}

// Zen tech-inspired peer names
const ZEN_PREFIXES = [
  'Zen', 'Nova', 'Pulse', 'Apex', 'Echo', 'Orbit', 'Nexus', 'Atlas',
  'Drift', 'Aero', 'Flux', 'Vibe', 'Volt', 'Sonic', 'Hyper', 'Swift',
  'Cosmic', 'Solar', 'Lunar', 'Cyber', 'Prism', 'Quantum', 'Stellar', 'Prime'
];

const ZEN_SUFFIXES = [
  'Node', 'Beam', 'Link', 'Core', 'Wave', 'Spark', 'Flow', 'Ray',
  'Craft', 'Grid', 'Port', 'Hub', 'Sync', 'Pilot', 'Rover', 'Sphere',
  'Unit', 'Byte', 'Gate', 'Beacon', 'Matrix', 'Relay', 'Field', 'Drop'
];

export function generateZenName(): string {
  const prefix = ZEN_PREFIXES[Math.floor(Math.random() * ZEN_PREFIXES.length)];
  const suffix = ZEN_SUFFIXES[Math.floor(Math.random() * ZEN_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

export const generateCuteName = generateZenName;

export function detectOS(userAgent: string): OSType {
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone')) return 'ios';
  if (ua.includes('ipad')) return 'ipados';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macos';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('android')) return 'android';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

export function getDeviceName(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('android')) return ua.includes('mobile') ? 'Android' : 'Android Tablet';
  if (ua.includes('linux')) return 'Linux PC';
  return 'Zen Device';
}

export function assignDeviceProfile(userAgent: string): DeviceInfo {
  const os = detectOS(userAgent);
  const profile = DEVICE_PROFILES[os];
  return {
    type: profile.type,
    name: profile.name,
    color: profile.color,
    emoji: profile.emoji,
    os,
  };
}

export const assignCritter = assignDeviceProfile;

export const AVATAR_CATEGORIES = [
  { id: 'popular', label: 'ยอดนิยม', icon: '✨', emojis: ['⚡', '🚀', '🔥', '✨', '🌈', '💫', '🎯', '😎', '🤩', '👾', '🦄', '🐲'] },
  { id: 'faces', label: 'อารมณ์', icon: '😊', emojis: ['😀', '😄', '😁', '🥳', '😎', '🤓', '🫡', '🥰', '🤠', '🥷', '🧙', '👻', '🤖', '👽', '💩'] },
  { id: 'animals', label: 'สัตว์', icon: '🐾', emojis: ['🐱', '🐶', '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🐰', '🐨', '🦉', '🦅', '🐬', '🐳', '🦈', '🦋', '🐝', '🐙', '🦖', '🐲', '🦄', '🐴'] },
  { id: 'nature', label: 'ธรรมชาติ', icon: '🌿', emojis: ['☀️', '🌙', '⭐', '🌟', '🌈', '☁️', '❄️', '🔥', '🌊', '🍀', '🌿', '🌵', '🌸', '🌻', '🍄', '🪐', '🌍'] },
  { id: 'tech', label: 'เทค', icon: '🚀', emojis: ['📱', '💻', '🖥️', '⌨️', '🎧', '🎮', '🕹️', '💾', '📡', '🛰️', '🚀', '🛸', '🤖', '🔋', '💡', '⚙️', '🔮'] },
  { id: 'things', label: 'ของโปรด', icon: '🎨', emojis: ['☕', '🍕', '🍜', '🍉', '🍩', '🍪', '🎸', '🎹', '⚽', '🏀', '🏆', '🎨', '📷', '💎', '🎁', '🧸', '🛡️'] },
] as const;

export const AVATAR_EMOJIS = Array.from(new Set(AVATAR_CATEGORIES.flatMap(category => category.emojis)));

export const ANIMAL_EMOJIS = AVATAR_EMOJIS;
