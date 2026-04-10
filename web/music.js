// ============================================================
// SATOSHI VALLEY — Procedural Music Engine
// Generates ambient soundtrack that changes with time & phase
// ============================================================

class MusicEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.volume = 0.12;
    this.masterGain = null;
    this.currentPhase = 'accumulation';
    this.timeOfDay = 'morning';
    this.bpm = 72;
    this.beat = 0;
    this.nextNoteTime = 0;
    this.schedulerInterval = null;
    
    // Musical scales (pentatonic for pleasant vibes)
    this.scales = {
      accumulation: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33], // C major pentatonic + extras
      hype: [293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25], // D major
      euphoria: [329.63, 369.99, 415.30, 493.88, 554.37, 659.25, 739.99], // E major  
      capitulation: [220.00, 246.94, 261.63, 329.63, 349.23, 440.00, 493.88], // A minor
    };
    
    // Chord progressions per phase
    this.chords = {
      accumulation: [[0,2,4], [3,5,0], [1,3,5], [4,6,1]], // Warm, hopeful
      hype: [[0,2,4], [2,4,6], [3,5,0], [5,0,2]], // Building energy
      euphoria: [[0,2,4], [4,6,1], [2,4,6], [5,0,2]], // Triumphant
      capitulation: [[0,2,4], [5,0,2], [3,5,0], [1,3,5]], // Melancholic
    };
    
    this.chordIndex = 0;
    this.barCount = 0;
    this.melodyNotes = [];
    this.lastMelodyNote = 0;

    // Location-based music (tavern has its own tune)
    this.location = 'overworld';

    // ── TAVERN PUB JAM ────────────────────────────────────────
    // D mixolydian scale: D E F# G A B C D'
    this.tavernScale = [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25, 587.33];
    // Catchy 32-note melody (pub jig feel, loops every 4 bars)
    this.tavernMelody = [
      0,2,3,4, 5,4,3,2,   // bouncy ascending, then back down
      4,5,6,7, 5,4,3,1,   // climb high, cascade back
      0,2,3,4, 3,4,5,3,   // repeat with variation
      4,3,2,1, 0,2,0,-1,  // resolve home (-1 = rest)
    ];
    // Bass: root(D), 4th(G), 5th(A), root — walking pattern
    this.tavernBass = [0,0,3,3, 4,4,0,0, 3,3,4,4, 0,0,4,0];
    this.tavernBpm = 138;
  }
  
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);
    
    // Reverb (simple delay-based)
    this.reverb = this.ctx.createConvolution ? this.createReverb() : this.masterGain;
  }
  
  createReverb() {
    // Simple delay for space
    const delay = this.ctx.createDelay();
    delay.delayTime.value = 0.15;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.2;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.3;
    
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(this.masterGain);
    
    // Also return dry path
    return this.masterGain;
  }
  
  start() {
    if (this.playing) return;
    this.init();
    this.playing = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
  }
  
  stop() {
    this.playing = false;
    if (this.schedulerInterval) clearInterval(this.schedulerInterval);
  }
  
  setPhase(phase) {
    const phases = ['accumulation', 'hype', 'euphoria', 'capitulation'];
    this.currentPhase = phases[phase] || 'accumulation';
    // Adjust BPM per phase
    this.bpm = { accumulation: 68, hype: 80, euphoria: 92, capitulation: 60 }[this.currentPhase];
  }
  
  setTimeOfDay(hour) {
    if (hour < 5) this.timeOfDay = 'night';
    else if (hour < 8) this.timeOfDay = 'dawn';
    else if (hour < 17) this.timeOfDay = 'day';
    else if (hour < 21) this.timeOfDay = 'evening';
    else this.timeOfDay = 'night';
    
    // Adjust volume by time
    const vols = { night: 0.06, dawn: 0.09, day: 0.12, evening: 0.10 };
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vols[this.timeOfDay], this.ctx.currentTime, 0.5);
    }
  }
  
  scheduler() {
    const scheduleAhead = 0.1;
    const tick = () => {
      if (!this.playing) return;
      while (this.nextNoteTime < this.ctx.currentTime + scheduleAhead) {
        this.playBeat(this.nextNoteTime);
        this.nextNoteTime += 60 / this.bpm / 2; // 8th notes
        this.beat++;
      }
      requestAnimationFrame(tick);
    };
    tick();
  }
  
  playBeat(time) {
    // Route to tavern jam when inside the pub
    if (this.location === 'tavern') { this.playTavernBeat(time); return; }

    const scale = this.scales[this.currentPhase];
    const chords = this.chords[this.currentPhase];
    
    // Every 16 beats = 1 bar, change chord
    if (this.beat % 16 === 0) {
      this.chordIndex = (this.chordIndex + 1) % chords.length;
      this.barCount++;
    }
    
    const chord = chords[this.chordIndex];
    
    // ---- PAD (sustained chord, always playing) ----
    if (this.beat % 16 === 0) {
      for (const idx of chord) {
        this.playNote(scale[idx] / 2, 60/this.bpm * 8, 'sine', 0.04, time);
      }
    }
    
    // ---- BASS (on beat 1 and 9) ----
    if (this.beat % 16 === 0 || this.beat % 16 === 8) {
      this.playNote(scale[chord[0]] / 4, 60/this.bpm * 2, 'triangle', 0.06, time);
    }
    
    // ---- MELODY (probabilistic, varies by time of day) ----
    const melodyChance = { night: 0.15, dawn: 0.25, day: 0.3, evening: 0.2 }[this.timeOfDay];
    
    if (this.beat % 2 === 0 && Math.random() < melodyChance) {
      // Pick a note from current chord or passing tone
      let noteIdx;
      if (Math.random() < 0.6) {
        noteIdx = chord[Math.floor(Math.random() * chord.length)];
      } else {
        // Stepwise motion from last note
        noteIdx = this.lastMelodyNote + (Math.random() < 0.5 ? 1 : -1);
        noteIdx = Math.max(0, Math.min(scale.length - 1, noteIdx));
      }
      
      const freq = scale[noteIdx] * (Math.random() < 0.3 ? 2 : 1);
      const dur = [0.2, 0.3, 0.4, 0.6][Math.floor(Math.random() * 4)];
      this.playNote(freq, dur, 'sine', 0.05, time);
      this.lastMelodyNote = noteIdx;
    }
    
    // ---- ARPEGGIOS (hype and euphoria only) ----
    if ((this.currentPhase === 'hype' || this.currentPhase === 'euphoria') && this.beat % 4 === 0) {
      const arpIdx = chord[this.beat % 12 / 4 | 0];
      this.playNote(scale[arpIdx] * 2, 0.15, 'sine', 0.025, time);
    }
    
    // ---- AMBIENT TEXTURE (night crickets, day birds) ----
    if (this.timeOfDay === 'night' && Math.random() < 0.03) {
      // Cricket-like chirp
      this.playNote(3000 + Math.random() * 2000, 0.03, 'sine', 0.01, time);
      this.playNote(3000 + Math.random() * 2000, 0.03, 'sine', 0.01, time + 0.05);
    }
    if (this.timeOfDay === 'dawn' && Math.random() < 0.02) {
      // Bird-like trill
      const bf = 1200 + Math.random() * 800;
      this.playNote(bf, 0.08, 'sine', 0.015, time);
      this.playNote(bf * 1.2, 0.06, 'sine', 0.012, time + 0.1);
      this.playNote(bf * 0.9, 0.1, 'sine', 0.01, time + 0.2);
    }
  }
  
  playNote(freq, dur, type, vol, time) {
    if (!this.ctx || !this.playing) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    
    // ADSR envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.02); // Attack
    gain.gain.linearRampToValueAtTime(vol * 0.7, time + dur * 0.3); // Decay
    gain.gain.setValueAtTime(vol * 0.7, time + dur * 0.7); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur); // Release
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }
  
  setLocation(loc) {
    if (this.location === loc) return;
    this.location = loc;
    if (loc === 'tavern') {
      this.bpm = this.tavernBpm;
      // Bump volume slightly for the pub vibe
      if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.volume * 1.3, this.ctx.currentTime, 0.3);
    } else {
      // Restore normal phase BPM and volume
      this.bpm = { accumulation: 68, hype: 80, euphoria: 92, capitulation: 60 }[this.currentPhase] || 72;
      if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.3);
    }
    this.beat = 0; // reset beat counter for clean loop start
  }

  playTavernBeat(time) {
    const sc = this.tavernScale;
    const mel = this.tavernMelody;
    const bas = this.tavernBass;
    const beatInLoop = this.beat % 64; // 32 melody notes = 64 8th-note beats (each melody note is 2 8th notes)
    const noteIdx = Math.floor(beatInLoop / 2);

    // ── BASS (every 4 beats = quarter note) ──
    if (beatInLoop % 4 === 0) {
      const bi = Math.floor(beatInLoop / 4);
      const bassNote = bas[bi % bas.length];
      this.playNote(sc[bassNote] / 2, 60/this.bpm * 1.8, 'triangle', 0.07, time);
    }

    // ── RHYTHM CHORDS (on beats 0,4,8,12 — like an acoustic strum) ──
    if (beatInLoop % 8 === 0) {
      // D major strum: D F# A
      this.playNote(sc[0], 60/this.bpm * 3, 'square', 0.015, time);
      this.playNote(sc[2], 60/this.bpm * 3, 'square', 0.015, time);
      this.playNote(sc[4], 60/this.bpm * 3, 'square', 0.015, time + 0.02);
    }
    // Off-beat chord stab (swing feel)
    if (beatInLoop % 8 === 5) {
      this.playNote(sc[3], 60/this.bpm * 1, 'square', 0.01, time);
      this.playNote(sc[5], 60/this.bpm * 1, 'square', 0.01, time);
    }

    // ── MELODY (every 2 beats = 8th note melody) ──
    if (beatInLoop % 2 === 0) {
      const mi = mel[noteIdx % mel.length];
      if (mi >= 0) {
        const freq = sc[mi];
        // Alternate between octaves for liveliness
        const oct = (noteIdx % 8 < 4) ? 1 : (Math.random() < 0.2 ? 2 : 1);
        this.playNote(freq * oct, 60/this.bpm * 0.9, 'square', 0.04, time);
      }
    }

    // ── PERCUSSION (kick + hi-hat feel using noise-like tones) ──
    // Kick on 1 and 3
    if (beatInLoop % 8 === 0) {
      this.playNote(80, 0.08, 'triangle', 0.06, time);
    }
    // Snare on 2 and 4
    if (beatInLoop % 8 === 4) {
      this.playNote(200, 0.04, 'square', 0.03, time);
      this.playNote(800, 0.02, 'sawtooth', 0.015, time);
    }
    // Hi-hat on every 8th
    if (beatInLoop % 2 === 0) {
      this.playNote(6000 + Math.random() * 2000, 0.02, 'square', 0.008, time);
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
}

// Export for use in game
window.MusicEngine = MusicEngine;
