import type { Vec3 } from '../types/engine';

export type ReverbPreset = 'none' | 'small_room' | 'cyber_alley' | 'cathedral' | 'open_field';

class SpatialAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBuf = new Uint8Array(32);

  private ambientOsc: OscillatorNode | null = null;
  private ambientPanner: PannerNode | null = null;
  private isAmbientRunning = false;

  public masterVol = 0.75;
  public sfxVol = 0.85;
  public ambienceVol = 0.55;
  public musicVol = 0.5;
  public currentReverb: ReverbPreset = 'cyber_alley';
  public dopplerStrength = 1.0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.ambienceGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.reverbWetGain = this.ctx.createGain();
      this.convolver = this.ctx.createConvolver();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.masterGain.gain.value = this.masterVol;
      this.sfxGain.gain.value = this.sfxVol;
      this.ambienceGain.gain.value = this.ambienceVol;
      this.musicGain.gain.value = this.musicVol;
      this.reverbWetGain.gain.value = 0.35;

      // Routing: channels -> dry to master + wet to convolver -> master -> analyser -> destination
      this.sfxGain.connect(this.masterGain);
      this.ambienceGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);

      this.sfxGain.connect(this.convolver);
      this.ambienceGain.connect(this.convolver);
      this.convolver.connect(this.reverbWetGain);
      this.reverbWetGain.connect(this.masterGain);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.applyReverbPreset(this.currentReverb);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public applyReverbPreset(preset: ReverbPreset): void {
    this.currentReverb = preset;
    if (!this.ctx || !this.convolver || !this.reverbWetGain) return;
    if (preset === 'none') {
      this.reverbWetGain.gain.value = 0;
      return;
    }
    const cfg: Record<Exclude<ReverbPreset, 'none'>, { duration: number; decay: number; wet: number }> = {
      small_room: { duration: 0.65, decay: 3.2, wet: 0.22 },
      cyber_alley: { duration: 1.45, decay: 2.4, wet: 0.38 },
      cathedral: { duration: 2.8, decay: 1.6, wet: 0.55 },
      open_field: { duration: 1.1, decay: 4.0, wet: 0.18 },
    };
    const { duration, decay, wet } = cfg[preset];
    this.reverbWetGain.gain.value = wet;

    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    this.convolver.buffer = impulse;
  }

  public setVolumes(vols: Partial<{ master: number; sfx: number; ambience: number; music: number }>): void {
    if (vols.master !== undefined) {
      this.masterVol = vols.master;
      if (this.masterGain) this.masterGain.gain.value = vols.master;
    }
    if (vols.sfx !== undefined) {
      this.sfxVol = vols.sfx;
      if (this.sfxGain) this.sfxGain.gain.value = vols.sfx;
    }
    if (vols.ambience !== undefined) {
      this.ambienceVol = vols.ambience;
      if (this.ambienceGain) this.ambienceGain.gain.value = vols.ambience;
    }
    if (vols.music !== undefined) {
      this.musicVol = vols.music;
      if (this.musicGain) this.musicGain.gain.value = vols.music;
    }
  }

  public updateListener(camPos: Vec3, forward: Vec3): void {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(camPos[0], t, 0.02);
      listener.positionY.setTargetAtTime(camPos[1], t, 0.02);
      listener.positionZ.setTargetAtTime(camPos[2], t, 0.02);
      listener.forwardX.setTargetAtTime(forward[0], t, 0.02);
      listener.forwardY.setTargetAtTime(forward[1], t, 0.02);
      listener.forwardZ.setTargetAtTime(forward[2], t, 0.02);
    } else {
      listener.setPosition(camPos[0], camPos[1], camPos[2]);
      listener.setOrientation(forward[0], forward[1], forward[2], 0, 1, 0);
    }
  }

  public playSpatialSfx(
    type: 'jump' | 'crystal' | 'laser' | 'step' | 'collect',
    pos: Vec3 = [0, 1, 0],
    relativeApproachSpeed = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createPanner();

    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 2.5;
    panner.maxDistance = 40;
    panner.positionX.value = pos[0];
    panner.positionY.value = pos[1];
    panner.positionZ.value = pos[2];

    // Simulated Doppler shift factor based on relative radial speed
    const dopplerPitch = Math.max(0.7, Math.min(1.4, 1 + (relativeApproachSpeed * 0.03 * this.dopplerStrength)));

    if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190 * dopplerPitch, now);
      osc.frequency.exponentialRampToValueAtTime(480 * dopplerPitch, now + 0.18);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.stop(now + 0.21);
    } else if (type === 'crystal' || type === 'collect') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33 * dopplerPitch, now);
      osc.frequency.setValueAtTime(880 * dopplerPitch, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(1174.66 * dopplerPitch, now + 0.28);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.stop(now + 0.33);
    } else if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(760 * dopplerPitch, now);
      osc.frequency.exponentialRampToValueAtTime(120 * dopplerPitch, now + 0.16);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      osc.stop(now + 0.18);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110 * dopplerPitch, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.07);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.stop(now + 0.09);
    }

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);
    osc.start(now);
  }

  public toggleSpatialBeacon(enable: boolean, sourcePos: Vec3 = [0, 2, 0]): boolean {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambienceGain) return false;

    if (!enable) {
      if (this.ambientOsc) {
        try { this.ambientOsc.stop(); } catch {}
        this.ambientOsc.disconnect();
        this.ambientOsc = null;
      }
      this.isAmbientRunning = false;
      return false;
    }

    if (this.isAmbientRunning && this.ambientPanner) {
      this.ambientPanner.positionX.value = sourcePos[0];
      this.ambientPanner.positionY.value = sourcePos[1];
      this.ambientPanner.positionZ.value = sourcePos[2];
      return true;
    }

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    const panner = ctx.createPanner();

    panner.panningModel = 'HRTF';
    panner.refDistance = 2;
    panner.maxDistance = 35;
    panner.positionX.value = sourcePos[0];
    panner.positionY.value = sourcePos[1];
    panner.positionZ.value = sourcePos[2];

    osc.type = 'sine';
    osc.frequency.value = 220;
    lfo.type = 'sine';
    lfo.frequency.value = 2.5;
    lfoGain.gain.value = 18;
    gain.gain.value = 0.16;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.ambienceGain);

    osc.start();
    lfo.start();
    this.ambientOsc = osc;
    this.ambientPanner = panner;
    this.isAmbientRunning = true;
    return true;
  }

  public updateBeaconPosition(pos: Vec3, dopplerPitch = 1): void {
    if (!this.ctx || !this.ambientPanner || !this.ambientOsc) return;
    const t = this.ctx.currentTime;
    this.ambientPanner.positionX.setTargetAtTime(pos[0], t, 0.03);
    this.ambientPanner.positionY.setTargetAtTime(pos[1], t, 0.03);
    this.ambientPanner.positionZ.setTargetAtTime(pos[2], t, 0.03);
    this.ambientOsc.frequency.setTargetAtTime(220 * dopplerPitch, t, 0.05);
  }

  public getSpectrumLevels(): number[] {
    if (!this.analyser) return [0, 0, 0, 0, 0, 0, 0, 0];
    this.analyser.getByteFrequencyData(this.freqBuf);
    const bars: number[] = [];
    for (let i = 0; i < 8; i++) {
      bars.push(Math.round((this.freqBuf[i * 2] / 255) * 100));
    }
    return bars;
  }
}

export const spatialAudio = new SpatialAudioEngine();
