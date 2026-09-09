import type { SoundCue, SoundStep, SoundType } from './types';

type StepOptions = Partial<Omit<SoundStep, 'frequency'>>;
const tone = (frequency: number, options: StepOptions = {}): SoundStep => ({
  frequency,
  duration: options.duration ?? .12,
  gain: options.gain ?? .038,
  wave: options.wave ?? 'sine',
  ...options,
});
const air = (options: StepOptions = {}): SoundStep => tone(180, {
  duration: .16,
  gain: .016,
  wave: 'noise',
  filter: 1400,
  ...options,
});
const cue = (cooldown: number, ...steps: SoundStep[]): SoundCue => ({ cooldown, steps });

// Zen Pulse is one coherent sound identity. Each interaction has its own short
// motif, while shared intervals and soft transients keep the app recognizable.
export const zenPulseCues: Record<SoundType, SoundCue> = {
  tick: cue(25, tone(1540, { duration: .026, gain: .022, wave: 'triangle', toFrequency: 920 })),
  tap: cue(35, air({ duration: .035, gain: .012, filter: 2600 }), tone(980, { duration: .05, gain: .024, wave: 'triangle', toFrequency: 720 })),
  toggleOn: cue(90, tone(540, { duration: .1, gain: .028, pan: -.15 }), tone(910, { at: .045, duration: .13, gain: .032, pan: .16 })),
  toggleOff: cue(90, tone(820, { duration: .09, gain: .026, pan: .14 }), tone(410, { at: .045, duration: .13, gain: .028, pan: -.12 })),
  modeSwitch: cue(150, air({ duration: .18, filter: 1800 }), tone(610, { duration: .18, toFrequency: 860, gain: .03 })),
  modePublic: cue(180, tone(392, { duration: .28, gain: .025, pan: -.18 }), tone(587, { at: .035, duration: .24, gain: .03 }), tone(880, { at: .085, duration: .2, gain: .026, pan: .18 })),
  modeWifi: cue(180, air({ duration: .15, filter: 3200, pan: -.2 }), tone(740, { duration: .12, gain: .026, pan: -.16 }), tone(1175, { at: .07, duration: .16, gain: .03, pan: .18 })),
  modePrivate: cue(180, tone(330, { duration: .32, gain: .025, filter: 900, pan: -.15 }), tone(494, { at: .035, duration: .28, gain: .028 }), tone(659, { at: .09, duration: .22, gain: .024, pan: .15 })),
  openModal: cue(70, air({ duration: .12, gain: .01, filter: 2200 }), tone(420, { duration: .12, gain: .022, toFrequency: 690 })),
  closeModal: cue(70, tone(620, { duration: .11, gain: .021, toFrequency: 310 }), air({ at: .025, duration: .09, gain: .008, filter: 1200 })),
  selectPeer: cue(120, tone(720, { duration: .1, gain: .028, pan: -.2 }), tone(1080, { at: .045, duration: .16, gain: .032, pan: .2 }), air({ at: .04, duration: .1, gain: .009, filter: 2800 })),
  copy: cue(100, tone(1480, { duration: .035, gain: .02, wave: 'triangle', pan: -.2 }), tone(1860, { at: .055, duration: .04, gain: .018, wave: 'triangle', pan: .2 })),
  connect: cue(260, air({ duration: .25, gain: .012, filter: 1700 }), tone(392, { duration: .18, gain: .026, pan: -.25 }), tone(587, { at: .07, duration: .2, gain: .03 }), tone(988, { at: .15, duration: .24, gain: .03, pan: .25 })),
  whoosh: cue(220, air({ duration: .3, gain: .027, filter: 1900, pan: -.3 }), tone(220, { duration: .28, gain: .018, toFrequency: 520, filter: 1000, pan: .25 })),
  sending: cue(280, tone(294, { duration: .22, gain: .022, pan: -.25 }), tone(440, { at: .045, duration: .2, gain: .025 }), tone(659, { at: .1, duration: .2, gain: .027, pan: .25 }), air({ at: .04, duration: .18, gain: .008, filter: 2400 })),
  success: cue(520, tone(523, { duration: .26, gain: .026, pan: -.2 }), tone(659, { at: .06, duration: .28, gain: .028 }), tone(988, { at: .13, duration: .34, gain: .03, pan: .2 })),
  complete: cue(650, air({ duration: .28, gain: .014, filter: 2600 }), tone(392, { duration: .3, gain: .023, pan: -.3 }), tone(587, { at: .07, duration: .32, gain: .027, pan: -.1 }), tone(784, { at: .15, duration: .36, gain: .029, pan: .1 }), tone(1175, { at: .24, duration: .44, gain: .031, pan: .3 })),
  notification: cue(520, tone(784, { duration: .22, gain: .031, pan: -.22 }), tone(1175, { at: .14, duration: .3, gain: .032, pan: .22 }), air({ at: .1, duration: .18, gain: .008, filter: 3000 })),
  reject: cue(220, tone(240, { duration: .14, gain: .03, wave: 'triangle', toFrequency: 150, pan: -.15 }), tone(170, { at: .09, duration: .18, gain: .027, wave: 'triangle', toFrequency: 105, pan: .15 })),
  block: cue(300, tone(185, { duration: .18, gain: .028, wave: 'sawtooth', filter: 720 }), air({ at: .06, duration: .12, gain: .018, filter: 620 }), tone(110, { at: .1, duration: .24, gain: .026, wave: 'triangle' })),
  drop: cue(180, air({ duration: .12, gain: .013, filter: 2100 }), tone(680, { duration: .18, gain: .025, toFrequency: 430 }), tone(340, { at: .09, duration: .2, gain: .02 })),
  progress25: cue(420, tone(494, { duration: .07, gain: .018, wave: 'triangle', pan: -.18 }), tone(659, { at: .035, duration: .09, gain: .018, pan: .12 })),
  progress50: cue(420, tone(587, { duration: .075, gain: .019, wave: 'triangle', pan: -.12 }), tone(784, { at: .035, duration: .1, gain: .02, pan: .14 })),
  progress75: cue(420, tone(659, { duration: .08, gain: .02, wave: 'triangle', pan: -.08 }), tone(988, { at: .035, duration: .11, gain: .021, pan: .18 })),
};
