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
const reverbMixInput = document.getElementById('reverb-mix');
const releaseInput = document.getElementById('env-release');

const midiStatusIndicator = document.getElementById('midi-status-indicator');
const midiStatusText = document.getElementById('midi-status-text');

// Keyboard Mapping & Notes (2 Octaves: C3 to B4)
// White keys only for simplicity in this minimal CSS design, 
// but we will support all halftones under the hood for MIDI.
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const START_OCTAVE = 3;
const NUM_OCTAVES = 2;

// Map computer keyboard to notes (Z-M for lower octave, Q-U for upper octave)
const KEYMAP = {
  'z':'C3', 's':'C#3', 'x':'D3', 'd':'D#3', 'c':'E3', 'v':'F3', 'g':'F#3', 'b':'G3', 'h':'G#3', 'n':'A3', 'j':'A#3', 'm':'B3',
  'q':'C4', '2':'C#4', 'w':'D4', '3':'D#4', 'e':'E4', 'r':'F4', '5':'F#4', 't':'G4', '6':'G#4', 'y':'A4', '7':'A#4', 'u':'B4'
};

// Store active notes to prevent repeated triggers on hold
const activeNotes = new Set();
// Store key DOM elements by note name
const keyElements = {};

// Helper: Note to MIDI number (C3 = 48)
function noteToMidi(noteName) {
  const note = noteName.slice(0, -1);
  const octave = parseInt(noteName.slice(-1));
  const index = NOTE_NAMES.indexOf(note);
  return (octave + 1) * 12 + index;
}

// Helper: MIDI number to Note (48 = C3)
function midiToNote(midiNum) {
  const octave = Math.floor(midiNum / 12) - 1;
  const note = NOTE_NAMES[midiNum % 12];
  return `${note}${octave}`;
}

function renderKeyboard() {
  keyboardContainer.innerHTML = '';
  
  for (let octave = START_OCTAVE; octave < START_OCTAVE + NUM_OCTAVES; octave++) {
    NOTE_NAMES.forEach(note => {
      const noteName = `${note}${octave}`;
      const isBlack = note.includes('#');
      
      const keyEl = document.createElement('div');
      keyEl.dataset.note = noteName;
      
      if (isBlack) {
        // Black Key
        keyEl.className = 'absolute top-0 w-8 h-32 bg-[#111] border border-black rounded-b-md z-10 cursor-pointer transition-colors shadow-lg';
        // Rough positioning logic based on note index
        const whiteKeysBefore = NOTE_NAMES.slice(0, NOTE_NAMES.indexOf(note)).filter(n => !n.includes('#')).length;
        const octaveOffset = (octave - START_OCTAVE) * 7;
        // 48px is the width of a white key
        keyEl.style.left = `calc(${((whiteKeysBefore + octaveOffset) * 48) - 16}px)`;
      } else {
        // White Key (matte charcoal/dark grey in our theme)
        keyEl.className = 'w-12 h-full bg-[#1a1a1a] border-r border-white/5 last:border-r-0 rounded-b cursor-pointer transition-colors hover:bg-[#222] relative z-0';
      }

      // Interaction
      keyEl.addEventListener('mousedown', () => triggerNoteOn(noteName));
      keyEl.addEventListener('mouseup', () => triggerNoteOff(noteName));
      keyEl.addEventListener('mouseleave', () => {
        if(activeNotes.has(noteName)) triggerNoteOff(noteName);
      });

      // Touch support
      keyEl.addEventListener('touchstart', (e) => { e.preventDefault(); triggerNoteOn(noteName); });
      keyEl.addEventListener('touchend', (e) => { e.preventDefault(); triggerNoteOff(noteName); });

      keyElements[noteName] = keyEl;
      if (!isBlack) {
        keyboardContainer.appendChild(keyEl);
      } else {
        // Append black keys after a short delay so they sit on top of the DOM structure
        setTimeout(() => keyboardContainer.appendChild(keyEl), 0);
      }
    });
  }
}

async function initEngine() {
  if (isInitialized) return;
  
  initBtn.textContent = 'Loading Tone.js...';
  
  try {
    // Dynamically import Tone.js from unpkg
    const module = await import('https://unpkg.com/tone@14.7.77/build/Tone.js');
    Tone = window.Tone || module.default || module;
    
    // Setup Audio Chain
    await Tone.start();
    
    reverb = new Tone.Reverb({
      decay: 2,
      preDelay: 0.01,
      wet: parseFloat(reverbMixInput.value)
    }).toDestination();
    
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: synthTypeSelect.value },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: parseFloat(releaseInput.value)
      }
    }).connect(reverb);
    
    Tone.Destination.volume.value = parseFloat(masterVolInput.value);
    
    isInitialized = true;
    initBtn.textContent = 'Audio Active';
    initBtn.classList.replace('text-white', 'text-green-400');
    initBtn.classList.replace('border-white/20', 'border-green-400/30');

    // Setup Web MIDI
    setupMidi();
    
  } catch (error) {
    console.error('Failed to init audio engine:', error);
    initBtn.textContent = 'Error Loading Engine';
    initBtn.classList.replace('text-white', 'text-red-400');
  }
}

function triggerNoteOn(noteName, velocity = 1) {
  if (!isInitialized || !synth) return;
  if (activeNotes.has(noteName)) return; // Prevent re-trigger
  
  activeNotes.add(noteName);
  synth.triggerAttack(noteName, Tone.now(), velocity);
  
  // Visual glow
  const el = keyElements[noteName];
  if (el) {
    if (noteName.includes('#')) {
      el.classList.add('bg-[#333]', 'shadow-[0_0_15px_rgba(255,255,255,0.2)]');
      el.classList.remove('bg-[#111]');
    } else {
      el.classList.add('bg-[#e0e0e0]', 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', 'z-20');
      el.classList.remove('bg-[#1a1a1a]');
    }
  }
}

function triggerNoteOff(noteName) {
  if (!isInitialized || !synth) return;
  
  activeNotes.delete(noteName);
  synth.triggerRelease(noteName, Tone.now());
  
  // Remove glow
  const el = keyElements[noteName];
  if (el) {
    if (noteName.includes('#')) {
      el.classList.remove('bg-[#333]', 'shadow-[0_0_15px_rgba(255,255,255,0.2)]');
      el.classList.add('bg-[#111]');
    } else {
      el.classList.remove('bg-[#e0e0e0]', 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', 'z-20');
      el.classList.add('bg-[#1a1a1a]');
    }
  }
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
      console.warn("MIDI access denied or unsupported.", err);
    }
  }
}

function handleMidiMessage(msg) {
  const [command, noteNum, velocity] = msg.data;
  
  // Note On
  if (command === 144 && velocity > 0) {
    const noteName = midiToNote(noteNum);
    triggerNoteOn(noteName, velocity / 127);
  }
  // Note Off (or Note On with 0 velocity)
  if (command === 128 || (command === 144 && velocity === 0)) {
    const noteName = midiToNote(noteNum);
    triggerNoteOff(noteName);
  }
}

// Event Listeners
initBtn.addEventListener('click', initEngine);

// Computer Keyboard
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; // ignore auto-repeat
  const noteName = KEYMAP[e.key.toLowerCase()];
  if (noteName) triggerNoteOn(noteName);
});

window.addEventListener('keyup', (e) => {
  const noteName = KEYMAP[e.key.toLowerCase()];
  if (noteName) triggerNoteOff(noteName);
});

// UI Controls Update
synthTypeSelect.addEventListener('change', (e) => {
  if (synth) {
    synth.set({ oscillator: { type: e.target.value } });
  }
});

masterVolInput.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById('val-vol').textContent = `${val} dB`;
  if (isInitialized) Tone.Destination.volume.value = val;
});

reverbMixInput.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById('val-rev').textContent = `${Math.round(val * 100)}%`;
  if (reverb) reverb.wet.value = val;
});

releaseInput.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById('val-rel').textContent = `${val}s`;
  if (synth) synth.set({ envelope: { release: val } });
});

// Start
renderKeyboard();
