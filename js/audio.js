/**
 * SoundManager - Procedural Web Audio API Sound Synthesizer
 * Generates all sound effects dynamically to avoid loading external assets.
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.muted = false;
    }

    /**
     * Initializes the AudioContext (must be called after user interaction)
     */
    init() {
        if (this.ctx) return;
        
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterVolume = this.ctx.createGain();
            this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime); // Master volume at 30%
            this.masterVolume.connect(this.ctx.destination);
        } catch (e) {
            console.error("Web Audio API not supported in this browser", e);
        }
    }

    /**
     * Helper to create a noise buffer for explosion and gunshot effects
     */
    getNoiseBuffer() {
        if (!this.ctx) return null;
        
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }

    /**
     * Play a gunshot sound (Gatling)
     */
    playShoot() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // 1. Core noise burst for gunpowder crack
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer();
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.Q.setValueAtTime(3, now);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterVolume);
        
        // 2. Low-frequency thud for weapon weight
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        
        oscGain.gain.setValueAtTime(0.6, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.connect(oscGain);
        oscGain.connect(this.masterVolume);
        
        noise.start(now);
        noise.stop(now + 0.1);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * Play a grenade explosion sound
     */
    playExplosion() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        const duration = 1.2;
        
        // 1. Low frequency blast (Oscillator pitch drop)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.4);
        
        // Low pass filter to make the blast deep and rumbling
        const lowPass = this.ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.setValueAtTime(200, now);
        lowPass.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        
        oscGain.gain.setValueAtTime(1.0, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(lowPass);
        lowPass.connect(oscGain);
        oscGain.connect(this.masterVolume);
        
        // 2. White noise layer for fire crackle and debris crash
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer();
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(150, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 0.6);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterVolume);
        
        osc.start(now);
        osc.stop(now + duration);
        noise.start(now);
        noise.stop(now + duration);
    }

    /**
     * Play a wave arrow storm sound (swoosh sweeps)
     */
    playArrowStorm() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // Trigger a series of arrow swooshes spread over 0.6 seconds
        for (let i = 0; i < 6; i++) {
            const delay = i * 0.12;
            const t = now + delay;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            osc.type = 'triangle';
            // Swoosh pitch sweeps downwards rapidly
            osc.frequency.setValueAtTime(1200 - (i * 100), t);
            osc.frequency.exponentialRampToValueAtTime(300, t + 0.25);
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, t);
            filter.Q.setValueAtTime(1.5, t);
            
            gain.gain.setValueAtTime(0.0, t);
            gain.gain.linearRampToValueAtTime(0.3, t + 0.05); // quick fade in
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3); // fade out
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);
            
            osc.start(t);
            osc.stop(t + 0.35);
        }
    }

    /**
     * Play heal spell sound (pleasant ascending arpeggio)
     */
    playHeal() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C Major arpeggio
        
        notes.forEach((freq, index) => {
            const t = now + (index * 0.08);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.4);
            
            gain.gain.setValueAtTime(0.0, t);
            gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            
            osc.connect(gain);
            gain.connect(this.masterVolume);
            
            osc.start(t);
            osc.stop(t + 0.45);
        });
    }

    /**
     * Play hit impact sound (enemy gets shot)
     */
    playHit() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer();
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.04);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);
        
        noise.start(now);
        noise.stop(now + 0.05);
    }

    /**
     * Play UI button click sound
     */
    playClick() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(300, now + 0.02);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Play deep war drum sound for wave start
     */
    playWaveStart() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.5);
        
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start(now);
        osc.stop(now + 0.6);
    }

    /**
     * Play victory chime for wave cleared
     */
    playWaveComplete() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        const chord = [329.63, 392.00, 493.88, 659.25]; // E minor 7 chord
        
        chord.forEach((freq, idx) => {
            const delay = idx * 0.1;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + delay);
            
            gain.gain.setValueAtTime(0.0, now + delay);
            gain.gain.linearRampToValueAtTime(0.25, now + delay + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);
            
            osc.connect(gain);
            gain.connect(this.masterVolume);
            
            osc.start(now + delay);
            osc.stop(now + delay + 0.7);
        });
    }

    /**
     * Play dramatic game over descending tune
     */
    playGameOver() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();

        const now = this.ctx.currentTime;
        const notes = [220.00, 196.00, 174.61, 146.83, 110.00]; // descending A minor chords notes
        
        notes.forEach((freq, index) => {
            const t = now + (index * 0.25);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.9, t + 0.6);
            
            const lowPass = this.ctx.createBiquadFilter();
            lowPass.type = 'lowpass';
            lowPass.frequency.setValueAtTime(300, t);
            
            gain.gain.setValueAtTime(0.0, t);
            gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            
            osc.connect(lowPass);
            lowPass.connect(gain);
            gain.connect(this.masterVolume);
            
            osc.start(t);
            osc.stop(t + 0.7);
        });
    }
}

// Global Sound Instance
const audio = new SoundManager();
