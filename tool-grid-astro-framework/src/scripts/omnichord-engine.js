let Tone;
let isInitialized = false;

// Audio Nodes
let synth;
let padSynth; // Infinite Drone
let masterFilter;
let masterReverb;
let kickSynth;
let hatSynth;
let rhythmLoop;
let rhythmVolNode;

// State
let selectedChord = null; // e.g., 'CMaj'
let chordNotes = []; // Array of Tone.js note strings calculated across 3 octaves
let activeStrumNotes = new Set();
let rhythmActive = false;
let playingDrone = false;

// DOM Elements
const initBtn = document.getElementById('init-btn');
const chordButtons = document.querySelectorAll('.chord-btn');
const strumPlate = document.getElementById('strum-plate');
const canvas = document.getElementById('strum-canvas');
const ctx = canvas.getContext('2d');

const rhythmToggleBtn = document.getElementById('btn-rhythm-toggle');
const rhythmThumb = document.getElementById('rhythm-thumb');
const masterBpm = document.getElementById('master-bpm');
const rhythmVol = document.getElementById('rhythm-vol');
const masterReverbInput = document.getElementById('master-reverb');
const masterVolInput = document.getElementById('master-vol');

// Initialization
async function initEngine() {
  if (isInitialized) return;
  initBtn.textContent = 'Loading Engine...';
  
  try {
    const module = await import('https://unpkg.com/tone@14.7.77/build/Tone.js');
    Tone = window.Tone || module.default || module;
    
    await Tone.start();

    // 1. Synthesizer Setup (Warm, perfect pitch, romantic woody tone)
    masterFilter = new Tone.Filter(1000, "lowpass");
    masterReverb = new Tone.Reverb({ decay: 3, preDelay: 0.05, wet: 0.3 });
    
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.5, sustain: 0.1, release: 1.5 }
    });
    
    // Pad Synth for Infinite Drone - Exact Match to omnichord-main
    padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth16" },
      envelope: { attack: 0.1, attackCurve: "exponential", decay: 0.3, sustain: 0.6, release: 1 }
    });
    
    // Exact Filter/Reverb stack from reference for the pad
    const padFilterHigh = new Tone.Filter(100, "highpass");
    const padFilterLow = new Tone.Filter(2000, "lowpass");
    const padReverb = new Tone.Reverb({ decay: 1.4, preDelay: 0.1, wet: 0.5 });
    
    padSynth.chain(padReverb, padFilterHigh, padFilterLow, Tone.Destination);
    padSynth.volume.value = -14; // Match Gain(0.2) from reference

    synth.chain(masterFilter, masterReverb, Tone.Destination);

    // 2. Rhythm Setup (Kick & Hat)
    rhythmVolNode = new Tone.Volume(parseFloat(rhythmVol.value)).toDestination();
    kickSynth = new Tone.MembraneSynth().connect(rhythmVolNode);
    hatSynth = new Tone.MetalSynth({
      frequency: 200,
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).connect(rhythmVolNode);

    Tone.Transport.bpm.value = parseInt(masterBpm.value, 10);
    
    let step = 0;
    rhythmLoop = new Tone.Loop((time) => {
      if (step % 4 === 0) kickSynth.triggerAttackRelease("C1", "8n", time);
      else if (step % 2 === 0) kickSynth.triggerAttackRelease("C1", "8n", time, 0.5); // weak kick
      
      if (step % 2 !== 0) hatSynth.triggerAttackRelease("32n", time, 0.3); // off-beat hat
      
      step = (step + 1) % 16;
    }, "8n");

    // Init values
    Tone.Destination.volume.value = parseFloat(masterVolInput.value);
    
    isInitialized = true;
    initBtn.textContent = 'Engine Active';
    initBtn.classList.replace('text-white/50', 'text-green-400');
    initBtn.classList.replace('border-[#27272a]', 'border-green-400/30');

  } catch (err) {
    console.error('Failed to init Omnichord engine:', err);
    initBtn.textContent = 'Init Failed';
  }
}

// Chord Math
const ROOT_OFFSETS = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
const QUALITY_INTERVALS = {
  'Maj': [0, 4, 7],
  'Min': [0, 3, 7],
  '7th': [0, 4, 7, 10],
  'Maj7': [0, 4, 7, 11],
  'Min7': [0, 3, 7, 10],
  'Dim': [0, 3, 6],
  'Aug': [0, 4, 8]
};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getChordNotes(root, quality) {
  const rootOffset = ROOT_OFFSETS[root];
  const intervals = QUALITY_INTERVALS[quality];
  
  let notes = [];
  // Build across octaves 3, 4, and 5
  for (let oct = 3; oct <= 5; oct++) {
    intervals.forEach(interval => {
      const midi = (oct + 1) * 12 + rootOffset + interval;
      const noteName = NOTE_NAMES[midi % 12];
      const noteOctave = Math.floor(midi / 12) - 1;
      notes.push(`${noteName}${noteOctave}`);
    });
  }
  return notes;
}

function selectChord(chordId, btnEl) {
  if (!isInitialized) initEngine();
  
  const root = chordId.replace(/(Maj7|Min7|Maj|Min|7th|Dim|Aug)/, '');
  const quality = chordId.replace(root, '');
  
  if (selectedChord === chordId && playingDrone) {
    // Toggle OFF Drone
    if (padSynth) padSynth.releaseAll();
    playingDrone = false;
    btnEl.classList.remove('border-white/60', 'text-white', 'shadow-[0_0_15px_rgba(255,255,255,0.1)]');
    btnEl.classList.add('border-[#27272a]', 'text-white/40');
    return;
  }

  // Release old drone
  if (padSynth) padSynth.releaseAll();

  // UI Update
  chordButtons.forEach(btn => {
    btn.classList.remove('border-white/60', 'text-white', 'shadow-[0_0_15px_rgba(255,255,255,0.1)]');
    btn.classList.add('border-[#27272a]', 'text-white/40');
  });
  
  btnEl.classList.remove('border-[#27272a]', 'text-white/40');
  btnEl.classList.add('border-white/60', 'text-white', 'shadow-[0_0_15px_rgba(255,255,255,0.1)]');

  selectedChord = chordId;
  playingDrone = true;
  
  chordNotes = getChordNotes(root, quality);
  // Sort notes by pitch
  chordNotes.sort((a, b) => {
    const octA = parseInt(a.slice(-1));
    const octB = parseInt(b.slice(-1));
    if (octA !== octB) return octA - octB;
    return NOTE_NAMES.indexOf(a.slice(0, -1)) - NOTE_NAMES.indexOf(b.slice(0, -1));
  });

  // Play Infinite Drone (Exact match to reference: Octave 2 for bass, Octave 3 for chord notes)
  const rootOffset = ROOT_OFFSETS[root];
  const intervals = QUALITY_INTERVALS[quality];
  let droneNotes = [`${NOTE_NAMES[rootOffset]}2`]; // Bass note in Octave 2

  intervals.forEach(interval => {
    const midi = 4 * 12 + rootOffset + interval; // Base Octave 3
    const noteName = NOTE_NAMES[midi % 12];
    const noteOctave = Math.floor(midi / 12) - 1;
    droneNotes.push(`${noteName}${noteOctave}`);
  });
  if (padSynth) padSynth.triggerAttack(droneNotes);
}

// Interaction
chordButtons.forEach(btn => {
  btn.addEventListener('mousedown', () => selectChord(btn.dataset.chord, btn));
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); selectChord(btn.dataset.chord, btn); });
});
initBtn.addEventListener('click', initEngine);

// Strum Plate Logic
let isStrumming = false;
let rect = strumPlate.getBoundingClientRect();
let canvasWidth = strumPlate.clientWidth;
let canvasHeight = strumPlate.clientHeight;
let ripples = [];

function resizeCanvas() {
  rect = strumPlate.getBoundingClientRect();
  canvasWidth = rect.width;
  canvasHeight = rect.height;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function handleStrum(yPos, xPos) {
  if (!isInitialized || chordNotes.length === 0) return;
  
  // Map Y to note index (inverted so top = high notes)
  const normalizedY = 1 - Math.max(0, Math.min(1, yPos / canvasHeight));
  const noteIndex = Math.floor(normalizedY * chordNotes.length);
  const clampedIndex = Math.max(0, Math.min(chordNotes.length - 1, noteIndex));
  
  const note = chordNotes[clampedIndex];
  
  if (!activeStrumNotes.has(note)) {
    // We crossed into a new note threshold
    synth.triggerAttackRelease(note, "8n");
    activeStrumNotes.add(note);
    
    // Slight detune/chorus effect naturally handled by PolySynth
    // Add visual ripple
    ripples.push({ x: xPos, y: yPos, radius: 2, alpha: 0.8 });
    
    // Clear note from active set quickly so we can re-strum it
    setTimeout(() => activeStrumNotes.delete(note), 100);
  }
}

strumPlate.addEventListener('pointerdown', (e) => {
  if (!isInitialized) initEngine();
  isStrumming = true;
  strumPlate.setPointerCapture(e.pointerId);
  handleStrum(e.clientY - rect.top, e.clientX - rect.left);
});

strumPlate.addEventListener('pointermove', (e) => {
  if (!isStrumming) return;
  handleStrum(e.clientY - rect.top, e.clientX - rect.left);
});

strumPlate.addEventListener('pointerup', (e) => {
  isStrumming = false;
  strumPlate.releasePointerCapture(e.pointerId);
  activeStrumNotes.clear();
});

// Canvas Animation Loop
function animateCanvas() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  for (let i = ripples.length - 1; i >= 0; i--) {
    let r = ripples[i];
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${r.alpha})`;
    ctx.fill();
    
    // Spread & fade
    r.radius += 1.5;
    r.alpha -= 0.02;
    
    if (r.alpha <= 0) ripples.splice(i, 1);
  }
  
  requestAnimationFrame(animateCanvas);
}
requestAnimationFrame(animateCanvas);

// Controls
rhythmToggleBtn.addEventListener('click', () => {
  if (!isInitialized) return;
  rhythmActive = !rhythmActive;
  if (rhythmActive) {
    Tone.Transport.start();
    rhythmLoop.start(0);
    rhythmToggleBtn.classList.replace('bg-[#09090b]', 'bg-white/20');
    rhythmThumb.classList.add('translate-x-4');
  } else {
    Tone.Transport.stop();
    rhythmLoop.stop();
    rhythmToggleBtn.classList.replace('bg-white/20', 'bg-[#09090b]');
    rhythmThumb.classList.remove('translate-x-4');
  }
});

masterBpm.addEventListener('input', (e) => {
  document.getElementById('val-bpm').textContent = `${e.target.value} BPM`;
  if (isInitialized) Tone.Transport.bpm.value = parseInt(e.target.value, 10);
});

rhythmVol.addEventListener('input', (e) => {
  document.getElementById('val-rhythm-vol').textContent = `${e.target.value} dB`;
  if (isInitialized) rhythmVolNode.volume.value = parseFloat(e.target.value);
});

masterReverbInput.addEventListener('input', (e) => {
  document.getElementById('val-reverb').textContent = `${e.target.value}%`;
  if (isInitialized) masterReverb.wet.value = parseFloat(e.target.value) / 100;
});

masterVolInput.addEventListener('input', (e) => {
  document.getElementById('val-vol').textContent = `${e.target.value} dB`;
  if (isInitialized) Tone.Destination.volume.value = parseFloat(e.target.value);
});
