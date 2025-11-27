let lastIntensityLevel;
let isPlaying = false;
let bpm = 120;
let beatDuration;
let playbackLoopTimeout;
let a = 0; // Perlin noise seed
let currentMode = 'ambient';
let currentBeat = 0;
let barCounter = 0;
let barsUntilRefresh = 4;
let nextChordInterval;
let barsSinceChord = 0;
let rhythmicIntensity = 0; // 0.0 to 1.0
let barsUntilFill = 8;
let compositionFocus = 'full'; // 'full', 'melody_only', 'rhythm_only', 'bass_only'
let barsUntilFocusChange = 4;
let currentDrumPattern = {}; // Missing declaration - this was causing the muting bug!
let currentBassline = [];
let currentBassNoteIndex = 0;
let tihaiActive = false, currentTihaiPattern = [], tihaiCounter = 0, tihaiRepetition = 0;
let fastRhythmEvent = false, currentFastRhythm = null, fastRhythmCounter = 0, fastRhythmSubCounter = 0;
let isJhala = false, jhalaCounter = 0, jhalaDurationBeats, jhalaProbability = 0.01, jhalaPattern = [0, 1];

// Individual drum volume controls (in dB) - Separate for each drum kit
let drumVolumes = {
    // Drum Kit 1 (Extra Vergine samples)
    kit1: {
        kick: -15,        // C1 - Main kick drum
        snare: -30,        // D1 - Main snare
        hihat: -20,       // C2/C#2 - Hi-hats
        percussion: -22,  // E1 - Percussion
        ride: -16,        // F#1 - Ride cymbal
        fx: -15,          // G1, A#1 - FX sounds
        gong: -18,        // A1 - Gong
        clap: -18          // D#1 - Clap/snap
    },
    // Drum Kit 2 (Ghosthack samples)
    kit2: {
        kick: -15,        // C1 - Main kick drum
        snare: -30,       // D1 - Main snare
        hihat: -26,       // C2/C#2 - Hi-hats
        clap: -20,        // D#1 - Clap
        ride: -18         // F#1 - Ride cymbal
    }
};

// Function to set individual drum volume for specific kit
function setDrumVolume(kitName, drumType, volumeDb) {
    if (drumVolumes[kitName] && drumVolumes[kitName].hasOwnProperty(drumType)) {
        drumVolumes[kitName][drumType] = volumeDb;
        
        // Apply volume directly to samplers
        applyDrumVolumes();
        
        console.log(`🥁 Set ${kitName} ${drumType} volume to ${volumeDb}dB`);
    } else {
        console.warn(`❌ Unknown kit or drum type: ${kitName}.${drumType}`);
    }
}

// Function to get individual drum volume
function getDrumVolume(kitName, drumType) {
    return drumVolumes[kitName]?.[drumType] || -10;
}

// Function to set all drum volumes for a kit
function setKitVolumes(kitName, volumes) {
    if (drumVolumes[kitName]) {
        Object.assign(drumVolumes[kitName], volumes);
        applyDrumVolumes();
        console.log(`🥁 Updated ${kitName} volumes:`, drumVolumes[kitName]);
    } else {
        console.warn(`❌ Unknown kit: ${kitName}`);
    }
}

// Function to set all drum volumes at once
function setAllDrumVolumes(volumes) {
    Object.assign(drumVolumes, volumes);
    applyDrumVolumes();
    console.log("🥁 Updated all drum volumes:", drumVolumes);
}

// Function to reset drum volumes to defaults
function resetDrumVolumes() {
    drumVolumes = {
        kit1: {
            kick: -10, snare: -8, hihat: -14, percussion: -12, ride: -16, fx: -15, gong: -18, clap: -8
        },
        kit2: {
            kick: -12, snare: -10, hihat: -16, clap: -10, ride: -18
        }
    };
    applyDrumVolumes();
    console.log("🥁 Reset drum volumes to defaults");
}

// Function to apply volumes by setting sampler master volume
function applyDrumVolumes() {
    // For multi-instrument samplers, set master volume to 0dB and let velocity handle individual sounds.
    if (drumSampler && drumSampler.loaded) {
        drumSampler.volume.value = 0;
    }
    if (drumSampler2 && drumSampler2.loaded) {
        drumSampler2.volume.value = 0;
    }
    
    // For single-instrument-type samplers, we can set the volume directly.
    if (hiHatSampler && hiHatSampler.loaded) {
        // This sampler is only used for the open hat from kit 1
        hiHatSampler.volume.value = drumVolumes.kit1.hihat;
    }
    if (hiHatSampler2 && hiHatSampler2.loaded) {
        // This sampler has both open and closed hats from kit 2
        hiHatSampler2.volume.value = drumVolumes.kit2.hihat;
    }
    console.log("Drum volumes applied.");
}

// Make functions globally accessible
window.setDrumVolume = setDrumVolume;
window.getDrumVolume = getDrumVolume;
window.setKitVolumes = setKitVolumes;
window.setAllDrumVolumes = setAllDrumVolumes;
window.resetDrumVolumes = resetDrumVolumes;
window.drumVolumes = drumVolumes;


async function togglePlayback() {
    // Use the async nature of Tone.start()
    await Tone.start();
  
    isPlaying = !isPlaying;
  
    const startStopButton = document.getElementById('start-stop-button');
    if (isPlaying) {
        startStopButton.classList.add('playing');
    } else {
        startStopButton.classList.remove('playing');
    }
  
    if (isPlaying) {
        refreshComposition();
        updatePlaybackParameters();
        playbackLoop();
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Screen Wake Lock is active.');
                wakeLock.addEventListener('release', () => {
                    console.log('Screen Wake Lock was released.');
                });
            }
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
        console.log("Playback started/resumed");
    } else {
        clearTimeout(playbackLoopTimeout);
        if (celloSampler) {
          celloSampler.releaseAll();
        }
        if (drumSampler) {
            drumSampler.releaseAll();
        }
        if (hiHatSampler) {
            hiHatSampler.releaseAll();
        }
        if (bassSampler) {
            bassSampler.releaseAll();
        }
        if (guitarSampler) {
            guitarSampler.releaseAll();
        }
        if (drumSampler2) {
            drumSampler2.releaseAll();
        }
        if (hiHatSampler2) {
            hiHatSampler2.releaseAll();
        }
        if (wakeLock !== null) {
            wakeLock.release();
            wakeLock = null;
        }
        console.log("Playback stopped");
    }
}

function chooseNextChordInterval() {
    nextChordInterval = random([1, 2, 1]);
    barsSinceChord = 0;
    console.log("→ Chords every", nextChordInterval, "bars");
}

function updatePlaybackParameters() {
    if (currentMode === 'ambient') {
        // Variable BPM for ambient mode
        bpm = map(noise(a * 0.06), 0, 1, 1, 100); // Slower, more ambient range
        beatDuration = 60000 / bpm;
        // Clear drum patterns in ambient mode
        currentDrumPattern = {};
    } else if (currentMode === 'rhythm') {
        // Evolving BPM for rhythm mode - House Style
        bpm = 120;
        beatDuration = 60000 / bpm;
        // Only generate a new drum pattern if we're in rhythm mode and don't have one
        if (Object.keys(currentDrumPattern).length === 0) {
            generateHousePattern(rhythmicIntensity);
        }
        // Tabla system removed - no tabla samples available
    } else if (currentMode === 'interaction') {
        // Fixed BPM for interaction mode (for timing effects)
        bpm = 130; // Slower BPM for interaction mode
        beatDuration = 60000 / bpm;
        // Clear any drum patterns since we only want effects in interaction mode
        currentDrumPattern = {};
    }
}
  
function updateEffects() {
    // Modulate reverb wetness
    let reverbWet = map(noise(a * 0.05), 0, 1, 0.2, 0.7);
    if (reverb && reverb.wet) {
      reverb.wet.rampTo(reverbWet, 0.1);
    }
  
    // Modulate delay feedback
    let delayFeedback = map(noise(a * 0.05 + 1000), 0, 1, 0.25, 0.75);
    if (delay && delay.feedback) {
      delay.feedback.rampTo(delayFeedback, 0.1);
    }
  
    // Modulate delay wetness
    let delayWet = map(noise(a * 0.05 + 2000), 0, 1, 0, 0.5);
    if (delay && delay.wet) {
      delay.wet.rampTo(delayWet, 0.1);
    }
  
    // Modulate low-pass filter frequency
    let filterFreq = map(noise(a * 0.05 + 3000), 0, 1, 800, 5000);
    if (lowPassFilter && lowPassFilter.frequency) {
      lowPassFilter.frequency.rampTo(filterFreq, 0.1);
    }
}
  
function playbackLoop() {
    if (!isPlaying) {
        clearTimeout(playbackLoopTimeout);
        return;
    }
    
    // Do the work of a beat
    playBeat();
    
    // Schedule the next beat using the now-current beatDuration
    let interval = beatDuration / currentTimeSignature.subdivision;
    playbackLoopTimeout = setTimeout(playbackLoop, interval);
}

function playBeat() {
    a += 1;
    updatePlaybackParameters();
    updateEffects();
  
    if (!isPlaying) return;

    // In interaction mode, only run effects and timing - no generative melody
    if (currentMode === 'interaction') {
        // Just update timing for effects, no note generation
        currentBeat = (currentBeat + 1) % (currentTimeSignature.beats * currentTimeSignature.subdivision);
        if (currentBeat === 0) {
            barCounter++;
        }
        return;
    }
  
    // choose the note for this subdivision (only for ambient and rhythm modes)
    let note, velocity = int(map(noise(a/10),0,1,50,127));
    let slotCount = currentTimeSignature.beats * currentTimeSignature.subdivision;
    let actualDur = beatDuration / currentTimeSignature.subdivision;
  
    // Jhala start?
    if (!isJhala && random() < jhalaProbability) {
      isJhala = true;
      jhalaCounter = 0;
      jhalaDurationBeats = int(random([4,16, 8])) * currentTimeSignature.subdivision;
      console.log("→ Jhala for", jhalaDurationBeats, "slots");
    }
  
    // decide note based on section
    if (isJhala) {
      // alternate steps in jhalaPattern
      let idx = currentBeat % currentSequence.length;
      let step = jhalaCounter % jhalaPattern.length;
      if (step === 0 && currentSequence[idx] != null) {
        note = currentSequence[idx];
      } else {
        // Find a different note to add variety, fallback to vadi/samvadi
        let opts = currentSequence.filter(n => n != null && n !== currentSequence[idx]);
        if (opts.length === 0) {
            opts = [currentRaga.vadi, currentRaga.samavadi];
        }
        note = random(opts);
      }
      actualDur = beatDuration / (currentTimeSignature.subdivision * 2);
      jhalaCounter++;
      if (jhalaCounter >= jhalaDurationBeats) {
        isJhala = false;
        console.log("→ Jhala ended.");
      }
  
    } else if (fastRhythmEvent && fastRhythmCounter < currentFastRhythm.length*2) {
      // continue fast rhythm
      let idx = fastRhythmSubCounter % currentFastRhythm.pattern.length;
      let noteIdx = currentFastRhythm.pattern[idx];
      let offIdx = idx % currentFastRhythm.noteOffset.length;
      note = currentRaga.aaroh[(noteIdx + currentFastRhythm.noteOffset[offIdx]) % currentRaga.aaroh.length];
      actualDur = beatDuration / 2;
      fastRhythmSubCounter++;
      if (fastRhythmSubCounter % (currentTimeSignature.subdivision/2) === 0) {
        fastRhythmCounter++;
      }
  
    } else if (tihaiActive) {
      if (tihaiRepetition >= 3) {
        // Tihai has finished.
        console.log("→ Tihai ended, refreshing composition.");
        refreshComposition();
        // Instead of defaulting to C, pick a random note from the new sequence
        note = random(currentSequence.filter(n => n !== null)); 
        tihaiActive = false;
        currentBeat = 0;
        barCounter = 0;
        barsSinceChord = 0;
      } else {
        // Tihai is in progress.
        note = currentRaga.aaroh[currentTihaiPattern[tihaiCounter]];
        tihaiCounter++;
  
        if (tihaiCounter >= currentTihaiPattern.length) {
          tihaiCounter = 0;
          tihaiRepetition++;
        }
      }
    } else {
      // default sequence
      if (currentSequence.length > 0) {
        note = currentSequence[currentBeat % currentSequence.length];
      }
    }
  
    // --- RHYTHM SECTION (runs only in 'rhythm' mode) ---
    if (currentMode === 'rhythm') {
        const step = currentBeat % 16;
        const isFullDrums = (compositionFocus === 'full' || compositionFocus === 'rhythm_only');
        
        // Debug: Only log on beat 0 to avoid spam
        if (step === 0) {
            if (isFullDrums) {
                console.log(`🥁 Drums full - focus: ${compositionFocus}, beat: ${currentBeat}`);
            } else {
                console.log(`🥁 Drums minimal - focus: ${compositionFocus}, beat: ${currentBeat}`);
            }
        }
        
        // Play kick (only in full mode)
        if (isFullDrums && currentDrumPattern['C1'][step] === 1) {
            if (drumSampler && drumSampler.loaded) {
                const kickVolume = Math.pow(10, getDrumVolume('kit1', 'kick') / 20);
                drumSampler.triggerAttack('C1', undefined, kickVolume);
            }
            if (drumSampler2 && drumSampler2.loaded) {
                const kickVolume = Math.pow(10, getDrumVolume('kit2', 'kick') / 20);
                drumSampler2.triggerAttack('C1', undefined, kickVolume);
            }
        }

        // Play snare (only in full mode)
        if (isFullDrums && currentDrumPattern['D1'][step] === 1) {
            if (drumSampler && drumSampler.loaded) {
                const snareVolume = Math.pow(10, getDrumVolume('kit1', 'snare') / 20);
                drumSampler.triggerAttack('D1', undefined, snareVolume);
            }
            if (drumSampler2 && drumSampler2.loaded) {
                const snareVolume = Math.pow(10, getDrumVolume('kit2', 'snare') / 20);
                drumSampler2.triggerAttack('D1', undefined, snareVolume);
                if (random() < 0.5) {
                    const clapVolume = Math.pow(10, getDrumVolume('kit2', 'clap') / 20);
                    drumSampler2.triggerAttack('D#1', undefined, clapVolume);
                }
            }
        }

        // Play percussion (only in full mode)
        if (isFullDrums && currentDrumPattern['perc'][step] === 1) {
            if (drumSampler && drumSampler.loaded) {
                const percNote = 'E1';
                if (drumSamples.hasOwnProperty(percNote)) {
                    const percVolume = Math.pow(10, getDrumVolume('kit1', 'percussion') / 20);
                    drumSampler.triggerAttack(percNote, undefined, percVolume);
                }
            }
        }

        // Play hi-hats (always plays, but simplified in minimal mode)
        const hatTrigger = currentDrumPattern['hats'][step];
        if (hatTrigger > 0 && hiHatSampler && hiHatSampler.loaded) {
            // In minimal mode, only play on strong beats and reduce complexity
            const shouldPlayHat = isFullDrums || (step % 4 === 0) || (step % 8 === 4);
            
            if (shouldPlayHat) {
                if (hatTrigger === 1) { // Closed hat - only from kit 2
                    if (hiHatSampler2 && hiHatSampler2.loaded) {
                        const hihatVolume = Math.pow(10, getDrumVolume('kit2', 'hihat') / 20);
                        hiHatSampler2.triggerAttack('C#2', undefined, hihatVolume);
                    }
                } else if (hatTrigger === 2 && isFullDrums) { // Open hat - from both kits
                    if (hiHatSampler && hiHatSampler.loaded) {
                         const hihatVolume1 = Math.pow(10, getDrumVolume('kit1', 'hihat') / 20);
                         hiHatSampler.triggerAttack('C2', undefined, hihatVolume1);
                    }
                    if (hiHatSampler2 && hiHatSampler2.loaded) {
                        const hihatVolume2 = Math.pow(10, getDrumVolume('kit2', 'hihat') / 20);
                        hiHatSampler2.triggerAttack('C2', undefined, hihatVolume2);
                    }
                }
            }
        }

        // Play ride cymbal (only in full mode)
        if (isFullDrums && currentDrumPattern['ride'][step] === 1) {
            if (drumSampler2 && drumSampler2.loaded) {
                const rideVolume = Math.pow(10, getDrumVolume('kit2', 'ride') / 20);
                drumSampler2.triggerAttack('F#1', undefined, rideVolume);
            }
        }

        // FX sounds (only in full mode)
        if (isFullDrums && random() < 0.008) {
            if (drumSampler && drumSampler.loaded) {
                const fxNote = random(['G1', 'A#1']);
                if (drumSamples.hasOwnProperty(fxNote)) {
                    const fxVolume = Math.pow(10, getDrumVolume('kit1', 'fx') / 20);
                    drumSampler.triggerAttack(fxNote, undefined, fxVolume);
                }
            }
        }

        // Subtle noise on off-beats (only in full mode)
        if (isFullDrums && (step % 4 === 2) && random() < 0.05) {
            if (drumSampler && drumSampler.loaded && drumSamples.hasOwnProperty('A1')) {
                const gongVolume = Math.pow(10, getDrumVolume('kit1', 'gong') / 20);
                drumSampler.triggerAttack('A1', undefined, gongVolume);
            }
        }
    }
  
    currentPlayingNote = note;
  
    // send the note
    if (note != null) {
      const noteName = midiNoteToName(note);
      const durationMs = (actualDur / 4);
      const duration = durationMs / 1000;
      const normalizedVelocity = velocity / 127;
  
      lightUpNote(note, durationMs);
  
      // --- Cello melody (plays when focus allows) ---
      if (compositionFocus === 'full' || compositionFocus === 'melody_only') {
        if (celloSampler && celloSampler.loaded) {
          try {
            celloSampler.triggerAttackRelease(noteName, duration, undefined, normalizedVelocity);
            
            if (guitarSampler && guitarSampler.loaded) {
                guitarSampler.triggerAttackRelease(noteName, duration, undefined, normalizedVelocity * 0.8);
            }

            // In Jhala (fast rhythm), add slight delay for texture
            if (isJhala) {
              setTimeout(() => {
                if (celloSampler && celloSampler.loaded) {
                  celloSampler.triggerAttackRelease(noteName, duration * 0.5, undefined, normalizedVelocity * 0.7);
                }
                if (guitarSampler && guitarSampler.loaded) {
                    guitarSampler.triggerAttackRelease(noteName, duration * 0.5, undefined, normalizedVelocity * 0.5);
                }
              }, 50);
            }
          } catch (error) {
            console.error("❌ Error playing melody note:", error);
          }
        } else {
          console.warn("🎻 Cello sampler not ready");
        }
      }

      // --- Pad bass (plays when focus allows) ---
      if (compositionFocus === 'full' || compositionFocus === 'bass_only') {
        if (padSampler && padSampler.loaded) {
            try {
                const bassNoteName = midiNoteToName(note - 12); // Transpose down one octave
                padSampler.triggerAttackRelease(bassNoteName, duration, undefined, normalizedVelocity * 0.8);
            } catch (error) {
                console.error("❌ Error playing Pad note:", error);
            }
        }
      }

      // --- Bassline (plays when focus allows) ---
      if (compositionFocus === 'full' || compositionFocus === 'bass_only') {
        if (currentBassline.length > 0) {
            const bassNote = currentBassline[currentBassNoteIndex % currentBassline.length];
            if (bassNote !== null && bassSampler && bassSampler.loaded) {
                try {
                    const bassNoteName = midiNoteToName(bassNote - 24); // Transpose down two octaves
                    bassSampler.triggerAttackRelease(bassNoteName, "8n", undefined, 0.9);
                } catch (error) {
                    console.error("❌ Error playing bass note:", error);
                }
            }
            currentBassNoteIndex++;
        }
      }
    }
  
    // ——— BAR & CHORD LOGIC (always runs) ———
    currentBeat++;
    if (currentBeat >= slotCount) {
      // bar rollover
      currentBeat = 0;
      barCounter++;
      barsSinceChord++;

      // --- Rhythmic Evolution Logic (only in rhythm mode) ---
      if (currentMode === 'rhythm') {
        // Slowly increase intensity over time
        rhythmicIntensity = min(1.0, rhythmicIntensity + 0.01); 
        
        barsUntilFill--;
        
        // Time for a drum fill?
        if (barsUntilFill <= 0) {
            console.log("💥 Triggering drum fill!");
            currentDrumPattern = generateDrumFill();
            barsUntilFill = random([8, 12, 16]); // Schedule next fill
            // Don't interfere with focus change timing
        }

        // Time to change focus?
        barsUntilFocusChange--;
        console.log(`⏱️ Focus countdown: ${barsUntilFocusChange} bars remaining`);
        if (barsUntilFocusChange <= 0) {
            const focusOptions = ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'melody_only', 'bass_only'];
            const oldFocus = compositionFocus;
            compositionFocus = random(focusOptions);
            console.log(`🧘 Composition focus changed from ${oldFocus} to: ${compositionFocus}`);
            barsUntilFocusChange = random([8, 16]);
            console.log(`⏱️ Next focus change in ${barsUntilFocusChange} bars`);
        }
      }
  
      // chord time?
      if (barsSinceChord >= nextChordInterval) {
        // pick root: first note of seq or fallback to vadi
        let rootOptions = currentSequence.filter(n => n !== null);
        if (rootOptions.length === 0) {
            rootOptions = [currentRaga.vadi, currentRaga.samavadi];
        }
        let root = random(rootOptions);
        console.log("▶ Triggering chord at bar", barCounter,
                    "root:", midiNoteToName(root));
        playChord(root, velocity);
        barsSinceChord = 0;
        chooseNextChordInterval();
      }
  
      // refresh melody?
      if (barCounter >= barsUntilRefresh) {
        barCounter = 0;
        if (currentMode === 'rhythm') {
             // Don't generate a new pattern if a fill is about to happen
            if (barsUntilFill > 1) { 
                generateHousePattern(rhythmicIntensity); // Generate a new beat every few bars
            }
        }
        refreshComposition();
        generateBassline();
      }
    }
}

function playChord(rootNote, velocity) {
    let chord = generateChord(rootNote);
    const chordNoteNames = chord.map(midiNoteToName);
    const durationMs = (beatDuration / (2 * currentTimeSignature.subdivision));
    const duration = durationMs / 1000;
    const normalizedVelocity = velocity / 127;

    chord.forEach(note => {
        lightUpNote(note, durationMs);
    });

    // Play chord with Cello and Guitar samplers
    if (compositionFocus === 'full' || compositionFocus === 'melody_only') {
        if (celloSampler && celloSampler.loaded) {
            try {
                celloSampler.triggerAttackRelease(chordNoteNames, "2n", undefined, normalizedVelocity * 0.6);
                if (guitarSampler && guitarSampler.loaded) {
                    guitarSampler.triggerAttackRelease(chordNoteNames, "2n", undefined, normalizedVelocity * 0.4);
                }
            } catch (error) {
                console.error("❌ Error playing cello/guitar chord:", error);
            }
        } else {
            console.warn("🎻 Cello sampler not ready for chord playback, skipping.");
        }
    }

    // Play chord with Pad sampler, transposed down
    if (compositionFocus === 'full' || compositionFocus === 'bass_only') {
        if (padSampler && padSampler.loaded) {
            try {
                const bassChordNoteNames = chord.map(n => midiNoteToName(n - 12));
                padSampler.triggerAttackRelease(bassChordNoteNames, "2n", undefined, normalizedVelocity * 0.5);
            } catch (error) {
                console.error("❌ Error playing Pad chord:", error);
            }
        } else {
            console.warn("🎹 Pad sampler not ready for chord playback, skipping.");
        }
    }
}

function generateBassline() {
    console.log("🎸 Generating new bassline...");
    const bassline = [];
    const root = currentRaga.vadi; 
    const fifth = root + 7;
    
    // Simple root-fifth pattern
    for (let i = 0; i < 4; i++) {
        bassline.push(root);
        bassline.push(root);
        bassline.push(fifth);
        bassline.push(root);
    }
    
    currentBassline = bassline;
    currentBassNoteIndex = 0;
}

function generateHousePattern(intensity = 0.5) {
    console.log(`🏠 Generating new House pattern with intensity ${intensity.toFixed(2)}...`);
    const pattern = {
        'C1': Array(16).fill(0),   // Kicks
        'D1': Array(16).fill(0),   // Snares/Claps
        'hats': Array(16).fill(0), // Hi-hats
        'perc': Array(16).fill(0),  // Percussion
        'ride': Array(16).fill(0) // Ride Cymbals
    };

    // 1. KICK (C1) - Four-on-the-floor
    for (let i = 0; i < 16; i += 4) {
        pattern['C1'][i] = 1;
    }

    // 2. SNARE/CLAP (D1 & D#1)
    pattern['D1'][4] = 1;
    pattern['D1'][12] = 1;
    // Add occasional ghost snares based on intensity
    if (random() < intensity * 0.3) {
        pattern['D1'][random([2, 6, 10, 14])] = 1;
    }

    // 3. HI-HATS (hats)
    // Off-beat open hats are classic house
    for (let i = 2; i < 16; i += 4) {
        pattern.hats[i] = 2; // Open hat on the off-beat
    }
    // Add 16th-note closed hats based on intensity
    for (let i = 0; i < 16; i++) {
        if (pattern.hats[i] === 0 && random() < intensity * 0.6) {
            pattern.hats[i] = 1; // Closed hat
        }
    }

    // 4. RIDE CYMBAL
    for (let i = 0; i < 16; i += 4) {
        if (random() < intensity * 0.4) {
            pattern.ride[i] = 1;
        }
    }


    // 5. PERCUSSION (perc)
    for (let i = 0; i < 16; i++) {
        if (pattern['C1'][i] === 0 && pattern['D1'][i] === 0 && random() < 0.1 + intensity * 0.2) {
            pattern.perc[i] = 1;
        }
    }

    currentDrumPattern = pattern;
}

function generateDrumFill() {
    console.log("🥁 Generating new (less aggressive) drum fill...");
    const fill = {
        'C1': Array(16).fill(0),
        'D1': Array(16).fill(0),
        'hats': Array(16).fill(0),
        'perc': Array(16).fill(0),
        'ride': Array(16).fill(0)
    };

    const fillPatterns = [
        // Pattern 1: Simple syncopated snare
        () => {
            fill['D1'][12] = 1;
            fill['D1'][14] = 1;
            fill['hats'][12] = 1;
            fill['hats'][13] = 1;
            fill['hats'][14] = 1;
            fill['hats'][15] = 1;
        },
        // Pattern 2: Percussion build-up
        () => {
            fill['perc'][10] = 1;
            fill['perc'][12] = 1;
            fill['perc'][14] = 1;
            fill['D1'][15] = 1;
        },
        // Pattern 3: Kick drum build
        () => {
            fill['C1'][8] = 1;
            fill['C1'][10] = 1;
            fill['C1'][12] = 1;
            fill['D1'][14] = 1;
        },
        // Pattern 4: Classic tom-like fill using perc
        () => {
            fill['perc'][8] = 1;
            fill['perc'][10] = 1;
            fill['D1'][12] = 1;
            fill['D1'][13] = 1;
        }
    ];

    // Choose a random fill pattern and execute it
    const chosenFill = random(fillPatterns);
    chosenFill();

    return fill;
}


// generateTablaPattern function removed - no tabla samples available 

function playMelodyNote(note) {
    if (!celloSampler || !celloSampler.loaded) {
        console.warn("🚫 Cello sampler not ready, skipping melody note:", note);
        return;
    }
    
    if (note && note !== null) {
        try {
            const noteName = midiNoteToName(note);
            // In interaction mode, we respect the focus
            if (compositionFocus === 'full' || compositionFocus === 'melody_only') {
                celloSampler.triggerAttack(noteName);
                if (guitarSampler && guitarSampler.loaded) {
                    guitarSampler.triggerAttack(noteName);
                }
            }

            // Also trigger Pad bass note
            if (padSampler && padSampler.loaded && (compositionFocus === 'full' || compositionFocus === 'bass_only')) {
                const bassNoteName = midiNoteToName(note - 12);
                padSampler.triggerAttack(bassNoteName);
            }
            currentPlayingNote = note;
        } catch (error) {
            console.error("❌ Error playing melody note:", error);
        }
    }
}

function stopMelodyNote() {
    if (!celloSampler || !celloSampler.loaded) {
        return;
    }
    
    try {
        celloSampler.releaseAll();
        if (padSampler && padSampler.loaded) {
            padSampler.releaseAll();
        }
        if (guitarSampler && guitarSampler.loaded) {
            guitarSampler.releaseAll();
        }
        currentPlayingNote = null;
    } catch (error) {
        console.error("❌ Error stopping melody note:", error);
    }
}

function stopAllNotes() {
    try {
        if (celloSampler && celloSampler.loaded) {
            celloSampler.releaseAll();
        }
        if (padSampler && padSampler.loaded) {
            padSampler.releaseAll();
        }
        if (bassSampler && bassSampler.loaded) {
            bassSampler.releaseAll();
        }
        if (guitarSampler && guitarSampler.loaded) {
            guitarSampler.releaseAll();
        }
        if (drumSampler && drumSampler.loaded) {
            drumSampler.releaseAll();
        }
        if (hiHatSampler && hiHatSampler.loaded) {
            hiHatSampler.releaseAll();
        }
        if (drumSampler2 && drumSampler2.loaded) {
            drumSampler2.releaseAll();
        }
        if (hiHatSampler2 && hiHatSampler2.loaded) {
            hiHatSampler2.releaseAll();
        }
    } catch (error) {
        console.error("❌ Error stopping all notes:", error);
    }
} 

// Test function to demonstrate drum volume controls
window.testDrumVolumes = function() {
    console.log("🥁 Testing individual drum volume controls...");
    console.log("Current drum volumes:", drumVolumes);
    
    // Test setting individual volumes for Kit 1
    setDrumVolume('kit1', 'kick', -5);      // Louder kick
    setDrumVolume('kit1', 'snare', -3);     // Louder snare
    setDrumVolume('kit1', 'hihat', -8);     // Quieter hi-hats
    setDrumVolume('kit1', 'percussion', -15); // Much quieter percussion
    
    // Test setting individual volumes for Kit 2
    setDrumVolume('kit2', 'kick', -8);      // Quieter kick
    setDrumVolume('kit2', 'snare', -6);     // Quieter snare
    setDrumVolume('kit2', 'hihat', -12);    // Much quieter hi-hats
    
    console.log("Updated drum volumes:", drumVolumes);
    
    // Test setting all volumes at once
    setAllDrumVolumes({
        kit1: {
            kick: -6, snare: -4, hihat: -6, percussion: -12, ride: -4, fx: -12, gong: -15, clap: -6
        },
        kit2: {
            kick: -4, snare: -4, hihat: -2, clap: -6, ride: -4
        }
    });
    
    console.log("Final drum volumes:", drumVolumes);
    console.log("🥁 Drum volume test complete! Try playing some rhythm mode to hear the changes.");
};

// Function to create a preset drum mix
window.setDrumPreset = function(presetName) {
    const presets = {
        'default': {
            kit1: {
                kick: -10, snare: -8, hihat: -4, percussion: -12, ride: -6, fx: -15, gong: -18, clap: -8
            },
            kit2: {
                kick: -12, snare: -10, hihat: -16, clap: -10, ride: -18
            }
        },
        'kick-heavy': {
            kit1: {
                kick: -2, snare: -8, hihat: -6, percussion: -12, ride: -8, fx: -15, gong: -18, clap: -8
            },
            kit2: {
                kick: -10, snare: -10, hihat: -14, clap: -10, ride: -16
            }
        },
        'snare-heavy': {
            kit1: {
                kick: -10, snare: -2, hihat: -6, percussion: -12, ride: -8, fx: -15, gong: -18, clap: -8
            },
            kit2: {
                kick: -10, snare: -10, hihat: -14, clap: -10, ride: -16
            }
        },
        'hihat-heavy': {
            kit1: {
                kick: -10, snare: -8, hihat: 0, percussion: -12, ride: -6, fx: -15, gong: -18, clap: -8
            },
            kit2: {
                kick: -10, snare: -10, hihat: -14, clap: -10, ride: -16
            }
        },
        'minimal': {
            kit1: {
                kick: -8, snare: -6, hihat: -8, percussion: -20, ride: -20, fx: -20, gong: -20, clap: -8
            },
            kit2: {
                kick: -10, snare: -10, hihat: -14, clap: -10, ride: -16
            }
        },
        'full-mix': {
            kit1: {
                kick: -4, snare: -4, hihat: -2, percussion: -8, ride: -4, fx: -10, gong: -12, clap: -6
            },
            kit2: {
                kick: -4, snare: -4, hihat: -2, clap: -6, ride: -4
            }
        }
    };
    
    if (presets[presetName]) {
        setAllDrumVolumes(presets[presetName]);
        console.log(`🥁 Applied drum preset: ${presetName}`);
    } else {
        console.warn(`❌ Unknown preset: ${presetName}. Available presets:`, Object.keys(presets));
    }
}; 