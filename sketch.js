// === GLOBAL STATE AND INSTANCES ===

// Audio
let celloSampler, drumSampler, hiHatSampler, padSampler, bassSampler, guitarSampler, drumSampler2, hiHatSampler2;
let reverb, delay, lowPassFilter, hiHatDelay, hiHatReverb;
let meter;
let samplersLoaded = 0;
const totalSamplers = 8;


// Raga & Compositions
let ragaData;
const allRagas = {};
let currentRaga;
let currentSequence = [];
let currentTimeSignature = { beats: 4, subdivision: 4 };


// Visuals
let grid = [];
let gridCols;
let cellSize;
let noteCells = {};
let textCanvas;
let backgroundShader;
let shaderTime = 0;
let hindiFont;
let currentColorPalette = [];
let currentPlayingNote = null;
let currentAmplitude = 0;


// System
let wakeLock = null;
let assetsLoaded = false;


// === P5.JS LIFECYCLE ===

function preload() {
  console.log("🔄 Starting preload()");
  // Load non-audio assets here
  console.log("📄 Loading ragadata.json...");
  ragaData = loadJSON('ragadata.json');
  console.log("🎨 Loading background shader...");
  backgroundShader = loadShader('background.vert', 'background.frag');
  console.log("🔤 Loading Hindi font...");
  hindiFont = loadFont('fonts/ome_bhatkhande_hindi.ttf');
  console.log("✅ Preload completed");
}

function setup() {
  console.log("🚀 Starting setup()");
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Initialize text canvas
  textCanvas = createGraphics(windowWidth, windowHeight);
  textCanvas.textFont(hindiFont);

  // Initialize Audio
  // Tone.setContext(getAudioContext());

  reverb = new Tone.Reverb({ decay: 4, wet: 0.7 });
  delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.5, wet: 0.5 });
  hiHatDelay = new Tone.FeedbackDelay({ delayTime: "16n", feedback: 0.3, wet: 0 });
  hiHatReverb = new Tone.Reverb({ decay: 1.5, wet: 0 });
  lowPassFilter = new Tone.Filter({ frequency: 2000, type: 'lowpass', Q: 1 });
  meter = new Tone.Meter();
  Tone.getDestination().connect(meter);

  let setupComplete = false;

  function onSamplerLoad(samplerName) {
    samplersLoaded++;
    console.log(`🎵 ${samplerName} sampler loaded! Progress: ${samplersLoaded}/${totalSamplers}`);
    if (samplersLoaded === totalSamplers && !setupComplete) {
      console.log("🎶 All samplers loaded!");
      completeSetup();
    }
  }

  function onSamplerError(samplerName, error) {
    console.error(`❌ ${samplerName} sampler failed to load:`, error);
  }

  function completeSetup() {
    if (setupComplete) return;
    setupComplete = true;
    assetsLoaded = true;

    // Hide the force load button if it was shown
    const forceButton = document.getElementById('force-load-button');
    if (forceButton) {
        forceButton.style.display = 'none';
    }

    console.log("📊 About to call processRagaData()");
    processRagaData();
  }

  // Force setup completion after 30 seconds if not all samplers load
  setTimeout(() => {
    if (!setupComplete) {
      console.warn("⏰ Timeout reached! Forcing setup completion with", samplersLoaded, "of", totalSamplers, "samplers loaded");
      completeSetup();
    }
  }, 30000);

  // Show manual load button after 15 seconds as backup
  setTimeout(() => {
    if (!setupComplete) {
      const forceButton = document.getElementById('force-load-button');
      if (forceButton) {
        forceButton.style.display = 'block';
        forceButton.addEventListener('click', () => {
          console.log("🔧 Manual force load triggered by user");
          completeSetup();
          forceButton.style.display = 'none';
        });
      }
    }
  }, 15000);

  console.log("🎻 Loading cello sampler...");
  celloSampler = new Tone.Sampler(celloSamplesMap, { 
    onload: () => onSamplerLoad("Cello"), 
    onerror: (error) => onSamplerError("Cello", error),
    release: 2, 
    baseUrl: "./" 
  }).chain(lowPassFilter, delay, reverb, Tone.Destination);
  
  console.log("🥁 Loading drum sampler...");
  drumSampler = new Tone.Sampler(drumSamples, { 
    onload: () => onSamplerLoad("Drum"), 
    onerror: (error) => onSamplerError("Drum", error),
    baseUrl: "./" 
  }).toDestination();
  
  console.log("🎯 Loading hi-hat sampler...");
  hiHatSampler = new Tone.Sampler(hiHatSamples, { 
    onload: () => onSamplerLoad("Hi-hat"), 
    onerror: (error) => onSamplerError("Hi-hat", error),
    baseUrl: "./" 
  }).chain(hiHatDelay, hiHatReverb, Tone.Destination);

  console.log("✨ Loading Pad sampler...");
  padSampler = new Tone.Sampler(padSamplesMap, {
    onload: () => onSamplerLoad("Pad"),
    onerror: (error) => onSamplerError("Pad", error),
    release: 2,
    baseUrl: "./"
  }).chain(lowPassFilter, delay, reverb, Tone.Destination);

  console.log("🎸 Loading Bass sampler...");
  bassSampler = new Tone.Sampler(bassSamplesMap, {
    onload: () => onSamplerLoad("Bass"),
    onerror: (error) => onSamplerError("Bass", error),
    release: 1,
    baseUrl: "./"
  }).toDestination();

  console.log("🎸 Loading Guitar sampler...");
  guitarSampler = new Tone.Sampler(guitarSamplesMap, {
    onload: () => onSamplerLoad("Guitar"),
    onerror: (error) => onSamplerError("Guitar", error),
    release: 2,
    baseUrl: "./"
  }).chain(lowPassFilter, delay, reverb, Tone.Destination);

  console.log("🥁 Loading Drum Kit 2 sampler...");
  drumSampler2 = new Tone.Sampler(drumKit2Samples, {
    onload: () => onSamplerLoad("Drum Kit 2"),
    onerror: (error) => onSamplerError("Drum Kit 2", error),
    baseUrl: "./"
  }).toDestination();

  console.log("🎯 Loading Hi-hat Kit 2 sampler...");
  hiHatSampler2 = new Tone.Sampler(hiHatKit2Samples, {
    onload: () => onSamplerLoad("Hi-hat Kit 2"),
    onerror: (error) => onSamplerError("Hi-hat Kit 2", error),
    baseUrl: "./"
  }).toDestination();


  // Set initial volumes
  celloSampler.volume.value = -8;
  padSampler.volume.value = -10;
  bassSampler.volume.value = -8;
  guitarSampler.volume.value = -4;
  
  // Apply drum volumes after samplers are loaded
  if (typeof applyDrumVolumes === 'function') {
    applyDrumVolumes();
  }

  // Setup UI listeners
  const modeToggleButton = document.getElementById('mode-toggle');
  if (modeToggleButton) {
    // Add click listeners to individual mode text spans for direct selection
    const modeTexts = modeToggleButton.querySelectorAll('.mode-text');
    modeTexts.forEach((modeText, index) => {
      modeText.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const targetMode = ['ambient', 'rhythm', 'interaction'][index];
        console.log(`Direct mode selection: ${targetMode}`);
        setMode(targetMode);
      });
    });
    
    // Fallback: if clicking on the button area (not on text), cycle through modes
    modeToggleButton.addEventListener('click', (e) => {
      // Only cycle if the click wasn't on a mode text span
      if (!e.target.classList.contains('mode-text')) {
        console.log('Mode toggle area clicked - cycling mode');
        toggleMode();
      }
    });
  }

  const startStopButton = document.getElementById('start-stop-button');
  if (startStopButton) {
      startStopButton.addEventListener('click', togglePlayback);
  }

  const backButton = select('#back-button');
  backButton.mousePressed(goToWelcomeScreen);
  
  console.log("⚙️ Setup completed, waiting for samplers to load...");
}

// Global debug function for testing samplers
window.testSamplers = function() {
  console.log("🧪 Testing all samplers...");
  
  if (celloSampler && celloSampler.loaded) {
    console.log("✅ Cello sampler is loaded");
    try {
      // Test basic note
      celloSampler.triggerAttackRelease('C4', '4n');
      console.log("✅ Cello sampler test note (C4) played successfully");
      
      // Test transposition - play a note that doesn't exist in samples
      setTimeout(() => {
        celloSampler.triggerAttackRelease('F#5', '4n');
        console.log("✅ Cello sampler transposition test (F#5) played successfully");
      }, 1000);
      
      setTimeout(() => {
        celloSampler.triggerAttackRelease('D2', '4n');
        console.log("✅ Cello sampler transposition test (D2) played successfully");
      }, 2000);
      
    } catch (error) {
      console.error("❌ Cello sampler test failed:", error);
    }
  } else {
    console.error("❌ Cello sampler not loaded");
  }
  
  if (drumSampler && drumSampler.loaded) {
    console.log("✅ Drum sampler is loaded");
    try {
      drumSampler.triggerAttack('C1');
      console.log("✅ Drum sampler test note played successfully");
    } catch (error) {
      console.error("❌ Drum sampler test failed:", error);
    }
  } else {
    console.error("❌ Drum sampler not loaded");
  }
  
  if (hiHatSampler && hiHatSampler.loaded) {
    console.log("✅ Hi-hat sampler is loaded");
    try {
      hiHatSampler.triggerAttack('C2');
      console.log("✅ Hi-hat sampler test note played successfully");
    } catch (error) {
      console.error("❌ Hi-hat sampler test failed:", error);
    }
  } else {
    console.error("❌ Hi-hat sampler not loaded");
  }

  if (padSampler && padSampler.loaded) {
    console.log("✅ Pad sampler is loaded");
    try {
      padSampler.triggerAttack('A2');
      console.log("✅ Pad sampler test note played successfully");
      
      setTimeout(() => {
        padSampler.triggerAttackRelease('G#4', '4n');
        console.log("✅ Pad sampler transposition test played successfully");
      }, 1000);

    } catch (error) {
      console.error("❌ Pad sampler test failed:", error);
    }
  } else {
    console.error("❌ Pad sampler not loaded");
  }
  
  if (bassSampler && bassSampler.loaded) {
    console.log("✅ Bass sampler is loaded");
    try {
      bassSampler.triggerAttack('C1');
      console.log("✅ Bass sampler test note played successfully");
    } catch (error) {
      console.error("❌ Bass sampler test failed:", error);
    }
  } else {
    console.error("❌ Bass sampler not loaded");
  }
  
  if (guitarSampler && guitarSampler.loaded) {
    console.log("✅ Guitar sampler is loaded");
    try {
      guitarSampler.triggerAttack('C4');
      console.log("✅ Guitar sampler test note played successfully");
    } catch (error) {
      console.error("❌ Guitar sampler test failed:", error);
    }
  } else {
    console.error("❌ Guitar sampler not loaded");
  }
  
  if (drumSampler2 && drumSampler2.loaded) {
    console.log("✅ Drum Kit 2 sampler is loaded");
    try {
      drumSampler2.triggerAttack('C1');
      console.log("✅ Drum Kit 2 sampler test note played successfully");
    } catch (error) {
      console.error("❌ Drum Kit 2 sampler test failed:", error);
    }
  } else {
    console.error("❌ Drum Kit 2 sampler not loaded");
  }

  if (hiHatSampler2 && hiHatSampler2.loaded) {
    console.log("✅ Hi-hat Kit 2 sampler is loaded");
    try {
      hiHatSampler2.triggerAttack('C2');
      console.log("✅ Hi-hat Kit 2 sampler test note played successfully");
    } catch (error) {
      console.error("❌ Hi-hat Kit 2 sampler test failed:", error);
    }
  } else {
    console.error("❌ Hi-hat Kit 2 sampler not loaded");
  }
  
  console.log("🧪 Sampler testing complete. Check above for results.");
  console.log("🎵 Guitar & Ikembe transposition tests will play over the next 3 seconds.");
};

function draw() {
    if (!assetsLoaded || !ragaData) {
      background(0);
      fill(255);
      textAlign(CENTER, CENTER);
      const loadingMessage = `Loading Samples... (${samplersLoaded} / ${totalSamplers})`;
      text(loadingMessage, width / 2, height / 2);
      return;
    }

    if (meter) {
        let level_dB = meter.getValue();
        currentAmplitude = map(level_dB, -48, 0, 0, 1, true);
        shaderTime += currentAmplitude * 0.009;
    }

    if(currentRaga && backgroundShader) {
        drawGrid();

        ortho(-width / 2, width / 2, height / 2, -height / 2, 0, 1000);
        
        shader(backgroundShader);
        
        backgroundShader.setUniform('iResolution', [width, height]);
        backgroundShader.setUniform('iTime', shaderTime);
        backgroundShader.setUniform('u_amplitude', currentAmplitude);
        
        const scheme = currentRaga.colorScheme;
        let c;
        c = color(scheme.background);
        backgroundShader.setUniform('u_color_background', [red(c) / 255.0, green(c) / 255.0, blue(c) / 255.0]);
        c = color(scheme.primary);
        backgroundShader.setUniform('u_color_primary', [red(c) / 255.0, green(c) / 255.0, blue(c) / 255.0]);
        c = color(scheme.secondary);
        backgroundShader.setUniform('u_color_secondary', [red(c) / 255.0, green(c) / 255.0, blue(c) / 255.0]);
        c = color(scheme.accent);
        backgroundShader.setUniform('u_color_accent', [red(c) / 255.0, green(c) / 255.0, blue(c) / 255.0]);

        noStroke();
        rect(-width/2,-height/2, width, height);

        image(textCanvas, -width / 2, height / 2, width, -height);

    } else {
        background(0);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    textCanvas.resizeCanvas(windowWidth, windowHeight);
    textCanvas.textFont(hindiFont);

    createGrid();
}

function setMode(targetMode) {
    if (currentMode === targetMode) {
        return; // Already in this mode, no change needed
    }
    
    const modeToggleButton = document.getElementById('mode-toggle');
    
    // Stop any cell loops when leaving interaction mode
    if (currentMode === 'interaction' && typeof stopAllCellLoops === 'function') {
        stopAllCellLoops();
    }
    
    // Remove all mode classes
    modeToggleButton.classList.remove('rhythm-active', 'interaction-active');
    
    // Set the new mode
    currentMode = targetMode;
    
    // Apply the appropriate class and setup
    if (currentMode === 'rhythm') {
        modeToggleButton.classList.add('rhythm-active');
        
    } else if (currentMode === 'interaction') {
        modeToggleButton.classList.add('interaction-active');
        
    } else { // ambient mode
        // Clear patterns when switching TO ambient mode
    }

    // Setup interactions for the new mode
    if (typeof setupCellInteractions === 'function') {
        setupCellInteractions();
    }

    // Track mode change with Microsoft Clarity
    if (typeof clarity === 'function') {
        clarity('set', 'playback_mode', currentMode);
        clarity('event', 'Mode Changed');
    }

    // If we are already playing, apply the new mode's parameters immediately
    if (isPlaying) {
        clearTimeout(playbackLoopTimeout); // Stop the old loop
        resetPlaybackState();
        updatePlaybackParameters(); // This will handle the BPM and drum changes
        playbackLoop(); // Start a new loop with the new parameters
    }
}

// Keep toggleMode for backward compatibility, but now it just cycles through modes
function toggleMode() {
    const modes = ['ambient', 'rhythm', 'interaction'];
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
}

function resetPlaybackState() {
    console.log("--- Resetting beat and bar counters ---");
    currentBeat = 0;
    barCounter = 0;
    barsSinceChord = 0;
    
    // Reset special rhythmic states to avoid them carrying over
    tihaiActive = false;
    tihaiCounter = 0;
    tihaiRepetition = 0;

    isJhala = false;
    jhalaCounter = 0;

    fastRhythmEvent = false;
    fastRhythmCounter = 0;
    fastRhythmSubCounter = 0;


}
