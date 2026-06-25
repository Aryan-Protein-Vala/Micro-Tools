// synth-engine.js
// Client-side execution for the Zero-Latency Web Synth Studio

let Tone = null;
let synth = null;
let reverb = null;
let isInitialized = false;

// UI Elements
const initBtn = document.getElementById('init-btn');
const keyboardContainer = document.getElementById('keyboard-container');
const synthTypeSelect = document.getElementById('synth-type');
const masterVolInput = document.getElementById('master-vol');

const midiStatusIndicator = document.getElementById('midi-status-indicator');
const midiStatusText = document.getElementById('midi-status-text');

// Modulators
let currentOctave = 3;
let transposeAmount = 0;
let additionalReeds = 0;

// Map computer keyboard to relative semitones from C of currentOctave
const KEYMAP = {
  '`': -5, '1': -4, 'q': -3, '2': -2, 'w': -1,
  'e': 0, '4': 1, 'r': 2, '5': 3, 't': 4,
  'y': 5, '7': 6, 'u': 7, '8': 8, 'i': 9, '9': 10, 'o': 11,
  'p': 12, '-': 13, '[': 14, '=': 15, ']': 16, '\\': 17
};

// Reverse map for rendering the keyboard labels
const REV_KEYMAP = Object.entries(KEYMAP).reduce((acc, [key, val]) => {
  acc[val] = key;
  return acc;
}, {});

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Store active keys to handle keyups correctly even if octave/transpose changes mid-note
const activeKeys = new Map(); // physical key string -> array of note names
const keyElements = {}; // visual elements mapped by relativeIndex

// Helper: MIDI number to Note (48 = C3)
function midiToNote(midiNum) {
  const octave = Math.floor(midiNum / 12) - 1;
  const note = NOTE_NAMES[midiNum % 12];
  return `${note}${octave}`;
}

function renderKeyboard() {
  keyboardContainer.innerHTML = '';
  
  // We render from relativeIndex -5 (G) to +17 (F)
  const minIndex = -5;
  const maxIndex = 17;
  
  let whiteKeyCount = 0;

  for (let i = minIndex; i <= maxIndex; i++) {
    // Math to determine if it's a black key based on relative index to C
    // normalized to positive C major scale index
    const normalized = (i % 12 + 12) % 12; 
    const isBlack = [1, 3, 6, 8, 10].includes(normalized);
    const keyLabel = REV_KEYMAP[i] || '';

    const keyEl = document.createElement('div');
    keyEl.dataset.index = i;
    
    if (isBlack) {
      keyEl.className = 'absolute top-0 w-8 h-32 bg-[#111] border border-black rounded-b-md z-10 cursor-pointer transition-colors shadow-lg flex items-end justify-center pb-2';
      keyEl.style.left = `calc(${(whiteKeyCount * 48) - 16}px)`;
      keyEl.innerHTML = `<span class="text-white/50 text-xs font-mono select-none">${keyLabel}</span>`;
    } else {
      keyEl.className = 'w-12 h-full bg-[#1a1a1a] border-r border-white/5 last:border-r-0 rounded-b cursor-pointer transition-colors hover:bg-[#222] relative z-0 flex flex-col items-center justify-end pb-4';
      
      // Bottom label (C, D, E) for specific keys based on user image
      let noteLabel = '';
      if (normalized === 0) noteLabel = '<span class="text-blue-500 font-bold mt-2 select-none">C</span>';
      else if (normalized === 2) noteLabel = '<span class="text-blue-500 font-bold mt-2 select-none">D</span>';
      else if (normalized === 4) noteLabel = '<span class="text-blue-500 font-bold mt-2 select-none">E</span>';
      else if (normalized === 5) noteLabel = '<span class="text-blue-500 font-bold mt-2 select-none">F</span>';
      else if (normalized === 7) noteLabel = '<span class="text-blue-500 font-bold mt-2 select-none">G</span>';
      else if (normalized === 9) noteLabel = '<span class="text-blue-500 font-bold mt-2 select-none">A</span>';
      else if (normalized === 11) noteLabel = '<span class="text-blue-500 font-bold mt-2 select-none">B</span>';

      keyEl.innerHTML = `<span class="text-white/50 text-xs font-mono select-none">${keyLabel}</span>${noteLabel}`;
      whiteKeyCount++;
    }

    // Interaction
    keyEl.addEventListener('mousedown', () => triggerKey(keyLabel));
    keyEl.addEventListener('mouseup', () => releaseKey(keyLabel));
    keyEl.addEventListener('mouseleave', () => {
      if(activeKeys.has(keyLabel)) releaseKey(keyLabel);
    });
    keyEl.addEventListener('touchstart', (e) => { e.preventDefault(); triggerKey(keyLabel); });
    keyEl.addEventListener('touchend', (e) => { e.preventDefault(); releaseKey(keyLabel); });

    keyElements[i] = keyEl;
    if (!isBlack) {
      keyboardContainer.appendChild(keyEl);
    } else {
      setTimeout(() => keyboardContainer.appendChild(keyEl), 0);
    }
  }
}

function applyInstrumentProfile(type) {
  if (!synth) return;
  switch(type) {
    case 'harmonium':
      synth.set({
        oscillator: { type: 'fatsawtooth' },
        envelope: { attack: 0.1, decay: 0, sustain: 1, release: 0.4 }
      });
      break;
    case 'guitar':
      synth.set({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.3 }
      });
      break;
    case 'sine':
      synth.set({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 1.5 }
      });
      break;
    case 'triangle':
      synth.set({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.5 }
      });
      break;
    case 'square':
      synth.set({
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 }
      });
      break;
    case 'sawtooth':
      synth.set({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.4 }
      });
      break;
  }
}

async function initEngine() {
  if (isInitialized) return;
  initBtn.textContent = 'Loading Tone.js...';
  try {
    const module = await import('https://unpkg.com/tone@14.7.77/build/Tone.js');
    Tone = window.Tone || module.default || module;
    
    await Tone.start();
    
    reverb = new Tone.Reverb({ decay: 2, preDelay: 0.01, wet: 0.2 }).toDestination();
    synth = new Tone.PolySynth(Tone.Synth).connect(reverb);
    
    applyInstrumentProfile(synthTypeSelect.value);
    Tone.Destination.volume.value = parseFloat(masterVolInput.value);
    
    isInitialized = true;
    initBtn.textContent = 'Audio Active';
    initBtn.classList.replace('text-white', 'text-green-400');
    initBtn.classList.replace('border-white/20', 'border-green-400/30');

    setupMidi();
  } catch (error) {
    console.error('Failed to init audio engine:', error);
    initBtn.textContent = 'Error Loading Engine';
    initBtn.classList.replace('text-white', 'text-red-400');
  }
}

function calculateNotes(relativeIndex) {
  const baseMidi = (currentOctave + 1) * 12; // C3 = 48
  const rootMidi = baseMidi + relativeIndex + transposeAmount;
  
  const notes = [rootMidi];
  
  if (additionalReeds > 0) {
    for (let i = 1; i <= additionalReeds; i++) {
      notes.push(rootMidi - (12 * i)); // Add lower octaves for fat reed sound
    }
  } else if (additionalReeds < 0) {
    for (let i = -1; i >= additionalReeds; i--) {
      notes.push(rootMidi + (12 * Math.abs(i))); // Add higher octaves
    }
  }
  
  return notes.map(midiToNote);
}

function setKeyGlow(relativeIndex, active) {
  const el = keyElements[relativeIndex];
  if (!el) return;
  
  const isBlack = [1, 3, 6, 8, 10].includes((relativeIndex % 12 + 12) % 12);
  
  if (active) {
    if (isBlack) {
      el.classList.add('bg-[#333]', 'shadow-[0_0_15px_rgba(255,255,255,0.2)]');
      el.classList.remove('bg-[#111]');
    } else {
      el.classList.add('bg-[#e0e0e0]', 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', 'z-20');
      el.classList.remove('bg-[#1a1a1a]');
    }
  } else {
    if (isBlack) {
      el.classList.remove('bg-[#333]', 'shadow-[0_0_15px_rgba(255,255,255,0.2)]');
      el.classList.add('bg-[#111]');
    } else {
      el.classList.remove('bg-[#e0e0e0]', 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', 'z-20');
      el.classList.add('bg-[#1a1a1a]');
    }
  }
}

function triggerKey(key, velocity = 1) {
  if (!isInitialized || !synth) return;
  if (activeKeys.has(key)) return;
  
  const relativeIndex = KEYMAP[key];
  if (relativeIndex === undefined) return;

  const notesToPlay = calculateNotes(relativeIndex);
  activeKeys.set(key, notesToPlay);
  
  synth.triggerAttack(notesToPlay, Tone.now(), velocity);
  setKeyGlow(relativeIndex, true);
}

function releaseKey(key) {
  if (!isInitialized || !synth) return;
  
  const notesToStop = activeKeys.get(key);
  if (!notesToStop) return;

  synth.triggerRelease(notesToStop, Tone.now());
  activeKeys.delete(key);
  
  const relativeIndex = KEYMAP[key];
  if (relativeIndex !== undefined) setKeyGlow(relativeIndex, false);
}

// Web MIDI setup
async function setupMidi() {
  if (navigator.requestMIDIAccess) {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      const updateMidiStatus = () => {
        let hasDevice = false;
        for (let input of midiAccess.inputs.values()) {
          hasDevice = true;
          input.onmidimessage = handleMidiMessage;
        }
        if (hasDevice) {
          midiStatusIndicator.classList.replace('bg-red-500/80', 'bg-green-500/80');
          midiStatusIndicator.classList.replace('shadow-[0_0_8px_rgba(239,68,68,0.5)]', 'shadow-[0_0_8px_rgba(34,197,94,0.5)]');
          midiStatusText.textContent = 'Connected';
        } else {
          midiStatusIndicator.classList.replace('bg-green-500/80', 'bg-red-500/80');
          midiStatusIndicator.classList.replace('shadow-[0_0_8px_rgba(34,197,94,0.5)]', 'shadow-[0_0_8px_rgba(239,68,68,0.5)]');
          midiStatusText.textContent = 'Disconnected';
        }
      };
      midiAccess.onstatechange = updateMidiStatus;
      updateMidiStatus();
    } catch (err) {
      console.warn("MIDI access denied.", err);
    }
  }
}

function handleMidiMessage(msg) {
  const [command, noteNum, velocity] = msg.data;
  
  // Try to find the closest mapped key for visual feedback
  const baseMidi = (currentOctave + 1) * 12;
  const relativeIndex = noteNum - baseMidi - transposeAmount;
  const mappedKey = REV_KEYMAP[relativeIndex] || `midi_${noteNum}`; // fallback key

  if (command === 144 && velocity > 0) {
    if (activeKeys.has(mappedKey)) return;
    
    // Calculate full array of notes for this MIDI note (supporting reeds)
    const notesToPlay = [midiToNote(noteNum)];
    if (additionalReeds > 0) {
      for (let i = 1; i <= additionalReeds; i++) notesToPlay.push(midiToNote(noteNum - (12 * i)));
    } else if (additionalReeds < 0) {
      for (let i = -1; i >= additionalReeds; i--) notesToPlay.push(midiToNote(noteNum + (12 * Math.abs(i))));
    }

    activeKeys.set(mappedKey, notesToPlay);
    synth.triggerAttack(notesToPlay, Tone.now(), velocity / 127);
    setKeyGlow(relativeIndex, true);

  } else if (command === 128 || (command === 144 && velocity === 0)) {
    const notesToStop = activeKeys.get(mappedKey);
    if (notesToStop) {
      synth.triggerRelease(notesToStop, Tone.now());
      activeKeys.delete(mappedKey);
    }
    setKeyGlow(relativeIndex, false);
  }
}

// Event Listeners
initBtn.addEventListener('click', initEngine);

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  if (KEYMAP[key] !== undefined) triggerKey(key);
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (KEYMAP[key] !== undefined) releaseKey(key);
});

synthTypeSelect.addEventListener('change', (e) => applyInstrumentProfile(e.target.value));

masterVolInput.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById('val-vol').textContent = `${val} dB`;
  if (isInitialized) Tone.Destination.volume.value = val;
});

// Modulators
const transLbl = document.getElementById('lbl-transpose');
const transVal = document.getElementById('val-transpose');
document.getElementById('btn-trans-down').onclick = () => { transposeAmount--; transLbl.innerText = transposeAmount; transVal.innerText = transposeAmount; };
document.getElementById('btn-trans-up').onclick = () => { transposeAmount++; transLbl.innerText = transposeAmount; transVal.innerText = transposeAmount; };

const octLbl = document.getElementById('lbl-octave');
document.getElementById('btn-oct-down').onclick = () => { currentOctave = Math.max(1, currentOctave - 1); octLbl.innerText = currentOctave; };
document.getElementById('btn-oct-up').onclick = () => { currentOctave = Math.min(7, currentOctave + 1); octLbl.innerText = currentOctave; };

const reedLbl = document.getElementById('lbl-reed');
document.getElementById('btn-reed-down').onclick = () => { additionalReeds--; reedLbl.innerText = additionalReeds; };
document.getElementById('btn-reed-up').onclick = () => { additionalReeds++; reedLbl.innerText = additionalReeds; };

// Start
renderKeyboard();
