export type SoundType =
  | 'tick' | 'tap' | 'modeSwitch' | 'modePublic' | 'modeWifi' | 'modePrivate'
  | 'toggleOn' | 'toggleOff' | 'openModal' | 'closeModal' | 'selectPeer'
  | 'copy' | 'connect' | 'whoosh' | 'sending' | 'success' | 'complete'
  | 'notification' | 'reject' | 'block' | 'drop' | 'progress25'
  | 'progress50' | 'progress75';

export type WaveShape = OscillatorType | 'noise';
export interface SoundStep { at?: number; duration: number; frequency: number; toFrequency?: number; gain: number; wave?: WaveShape; filter?: number; pan?: number; attack?: number; }
export interface SoundCue { cooldown: number; steps: SoundStep[]; }
