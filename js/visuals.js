// === WAVE FUNCTION COLLAPSE FOR MELODY GENERATION ===

// Global state for cell interactions
let activeCellLoops = new Map(); // cellId -> {pattern: [], isPlaying: boolean, timeoutId: timeoutId}

// Wave Function Collapse Algorithm for generating unique melody patterns
function generateUniqueMelodyWFC(cellId, ragaData, startingNote) {
    // Determine time signature based on cell position
    const seed = parseInt(cellId.replace(/[^0-9]/g, '')) || 0;
    
    // Possible time signatures for variety (numerator/8)
    const possibleTimeSignatures = [
        { beats: 2, subdivision: 8 },  // 2/8 - Quick, binary
        { beats: 3, subdivision: 8 },  // 3/8 - Waltz-like
        { beats: 4, subdivision: 8 },  // 4/8 - Standard
        { beats: 5, subdivision: 8 },  // 5/8 - Asymmetrical
        { beats: 7, subdivision: 8 },  // 7/8 - Complex
        { beats: 8, subdivision: 8 }   // 8/8 - Extended
    ];
    
    const sigIndex = seed % possibleTimeSignatures.length;
    const timeSignature = possibleTimeSignatures[sigIndex];
    
    // Pattern length equals the number of beats (since we're working in 8th notes)
    const patternLength = timeSignature.beats;
    
    console.log(`Cell ${cellId}: ${timeSignature.beats}/8 time signature, ${patternLength} notes`);
    
    const pattern = [];
    
    // Available notes from raga (weighted by importance)
    const noteWeights = new Map();
    
    // High weight for aaroh notes
    ragaData.aaroh.forEach(note => {
        noteWeights.set(note, 3);
    });
    
    // Medium weight for avroh notes
    ragaData.avroh.forEach(note => {
        const current = noteWeights.get(note) || 0;
        noteWeights.set(note, current + 2);
    });
    
    // Very high weight for vadi and samavadi
    noteWeights.set(ragaData.vadi, (noteWeights.get(ragaData.vadi) || 0) + 5);
    noteWeights.set(ragaData.samavadi, (noteWeights.get(ragaData.samavadi) || 0) + 4);
    
    // Add pakad phrases with high weights
    ragaData.pakad.forEach(phrase => {
        phrase.forEach(note => {
            const current = noteWeights.get(note) || 0;
            noteWeights.set(note, current + 3);
        });
    });
    
    // Convert to weighted array for selection
    const weightedNotes = [];
    noteWeights.forEach((weight, note) => {
        for (let i = 0; i < weight; i++) {
            weightedNotes.push(note);
        }
    });
    
    // WFC constraints based on Indian classical music theory
    const constraints = {
        // Melodic intervals (prefer steps and consonant intervals)
        allowedIntervals: [1, 2, 3, 4, 5, 7, 8, 12], // semitones
        // Rest probability varies by time signature complexity
        restProbability: timeSignature.beats <= 3 ? 0.1 : // Simple meters: fewer rests
                        timeSignature.beats <= 5 ? 0.15 : // Medium meters: some rests  
                        0.2, // Complex meters: more rests for clarity
        // Octave variations
        octaveVariations: [-12, 0, 12]
    };
    
    // Start with the cell's visual note
    let lastNote = startingNote;
    
    // First note is always the starting note (what's displayed in the cell)
    pattern.push({
        midiNote: startingNote,
        velocity: Math.floor(70 + ((seed % 100) / 100 * 30)), // Velocity 70-100
        timeSignature: timeSignature // Store time signature with the pattern
    });
    
    // Generate the remaining notes using WFC principles
    for (let i = 1; i < patternLength; i++) {
        // Use deterministic randomness based on cell position
        const randomSeed = (seed + i * 127) % 1000;
        let rand = (Math.sin(randomSeed) + 1) / 2; // Normalize to 0-1
        
        // Rest probability (adjusted for time signature complexity)
        if (rand < constraints.restProbability) {
            pattern.push(null);
            continue;
        }
        
        // Add rhythmic considerations based on time signature
        const isFirstBeat = i === 0;
        const isStrongBeat = (timeSignature.beats >= 4) && (i % 2 === 0); // Emphasize even beats in longer meters
        const isLastBeat = i === (patternLength - 1);
        
        // Select note with constraints
        let candidateNotes = [...weightedNotes];
        
        // Favor important notes on strong beats in complex time signatures
        if ((isFirstBeat || isStrongBeat || isLastBeat) && timeSignature.beats >= 5) {
            candidateNotes.push(ragaData.vadi, ragaData.samavadi);
        }
        
        // Apply melodic interval constraints if we have a previous note
        if (lastNote !== null) {
            candidateNotes = candidateNotes.filter(note => {
                const interval = Math.abs(note - lastNote);
                return constraints.allowedIntervals.includes(interval % 12);
            });
            
            // If no candidates pass constraints, use all notes
            if (candidateNotes.length === 0) {
                candidateNotes = [...weightedNotes];
            }
        }
        
        // Select note
        const noteIndex = Math.floor(rand * candidateNotes.length);
        let selectedNote = candidateNotes[noteIndex];
        
        // Add octave variation based on position (more variation in complex meters)
        const octaveRand = ((seed + i * 73) % 100) / 100;
        const octaveChance = timeSignature.beats >= 7 ? 0.25 : 0.15; // More variation in complex meters
        if (octaveRand < octaveChance) {
            const octaveShift = constraints.octaveVariations[Math.floor(octaveRand * 10) % constraints.octaveVariations.length];
            selectedNote += octaveShift;
        }
        
        // Ensure note is in playable range
        selectedNote = Math.max(36, Math.min(96, selectedNote));
        
        pattern.push({
            midiNote: selectedNote,
            velocity: Math.floor(60 + (rand * 40)) // Velocity 60-100
        });
        
        lastNote = selectedNote;
    }
    
    // Store the time signature info with the pattern
    pattern.timeSignature = timeSignature;
    
    console.log(`Generated ${timeSignature.beats}/8 pattern for cell ${cellId} starting with note ${startingNote}:`, pattern);
    return pattern;
}

// === MOUSE/TOUCH INTERACTION SYSTEM ===

let canvasElement = null;
let domEventListenersAdded = false;

function setupCellInteractions() {
    // Only initialize cell interactions if we're in interaction mode
    if (currentMode === 'interaction') {
        console.log("Cell interactions enabled for interaction mode");
        
        // Ensure Tone.js context is ready
        if (Tone.context.state !== 'running') {
            Tone.start();
        }
        
        // Add DOM event listeners to canvas
        addCanvasEventListeners();
    } else {
        // Remove DOM event listeners when not in interaction mode
        removeCanvasEventListeners();
    }
}

function addCanvasEventListeners() {
    if (domEventListenersAdded) return;
    
    canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
    // Add UI protection - make sure UI elements get touch events first
    addUIProtection();
    
    canvasElement.addEventListener('mousedown', handleCanvasMouseDown);
    canvasElement.addEventListener('mouseup', handleCanvasMouseUp);
    canvasElement.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    canvasElement.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });
    
    domEventListenersAdded = true;
    console.log('Canvas event listeners added');
}

function removeCanvasEventListeners() {
    if (!domEventListenersAdded || !canvasElement) return;
    
    canvasElement.removeEventListener('mousedown', handleCanvasMouseDown);
    canvasElement.removeEventListener('mouseup', handleCanvasMouseUp);
    canvasElement.removeEventListener('touchstart', handleCanvasTouchStart);
    canvasElement.removeEventListener('touchend', handleCanvasTouchEnd);
    
    // Remove UI protection
    removeUIProtection();
    
    domEventListenersAdded = false;
    console.log('Canvas event listeners removed');
}

function addUIProtection() {
    // Add high-priority touch listeners to UI elements that stop propagation
    const uiElements = [
        '#mode-toggle',
        '#start-stop-button',
        '#back-button',
        '.footer-controls',
        '.top-bar'
    ];
    
    uiElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            // Use capture phase to get events before canvas
            element.addEventListener('touchstart', preventCanvasTouch, { capture: true, passive: false });
            element.addEventListener('touchend', preventCanvasTouch, { capture: true, passive: false });
            element.addEventListener('touchmove', preventCanvasTouch, { capture: true, passive: false });
        }
    });
}

function removeUIProtection() {
    const uiElements = [
        '#mode-toggle',
        '#start-stop-button', 
        '#back-button',
        '.footer-controls',
        '.top-bar'
    ];
    
    uiElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.removeEventListener('touchstart', preventCanvasTouch, { capture: true });
            element.removeEventListener('touchend', preventCanvasTouch, { capture: true });
            element.removeEventListener('touchmove', preventCanvasTouch, { capture: true });
        }
    });
}

function preventCanvasTouch(event) {
    // Stop the event from reaching canvas
    event.stopPropagation();
    console.log('UI touch protected from canvas');
    // Don't prevent default - let the UI element handle the touch normally
}

function isEventOnUIElement(clientX, clientY) {
    // Check if touch/click is on any UI element
    const elementsToCheck = [
        '#mode-toggle',
        '#start-stop-button', 
        '#back-button',
        '.top-bar',
        '.footer-controls',
        '#playback-controls'
    ];
    
    for (let selector of elementsToCheck) {
        const element = document.querySelector(selector);
        if (element) {
            const rect = element.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right && 
                clientY >= rect.top && clientY <= rect.bottom) {
                return true;
            }
        }
    }
    return false;
}

function handleCanvasMouseDown(event) {
    if (currentMode !== 'interaction' || !currentRaga || !grid || grid.length === 0) return;
    
    // Check if click is on UI element - if so, let UI handle it
    if (isEventOnUIElement(event.clientX, event.clientY)) {
        return; // Let UI handle this click
    }
    
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const cellInfo = getCellFromCoordinates(x, y);
    
    if (cellInfo) {
        startCellLoop(cellInfo);
        event.preventDefault();
    }
}

function handleCanvasMouseUp(event) {
    if (currentMode !== 'interaction' || !currentRaga || !grid || grid.length === 0) return;
    
    // Check if click is on UI element - if so, let UI handle it
    if (isEventOnUIElement(event.clientX, event.clientY)) {
        return; // Let UI handle this click
    }
    
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const cellInfo = getCellFromCoordinates(x, y);
    
    if (cellInfo) {
        stopCellLoop(cellInfo.id);
        event.preventDefault();
    }
}

function handleCanvasTouchStart(event) {
    if (currentMode !== 'interaction' || !currentRaga || !grid || grid.length === 0) return;
    
    const rect = canvasElement.getBoundingClientRect();
    let foundCellTouch = false;
    
    for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        
        // Check if touch is on UI element - if so, let UI handle it
        if (isEventOnUIElement(touch.clientX, touch.clientY)) {
            continue; // Skip this touch, let UI handle it
        }
        
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const cellInfo = getCellFromCoordinates(x, y);
        
        if (cellInfo) {
            cellInfo.touchId = touch.identifier;
            startCellLoop(cellInfo);
            foundCellTouch = true;
        }
    }
    
    // Only prevent default if we actually handled a cell touch
    if (foundCellTouch) {
        event.preventDefault();
    }
}

function handleCanvasTouchEnd(event) {
    if (currentMode !== 'interaction' || !currentRaga || !grid || grid.length === 0) return;
    
    // Check if any remaining touches are on UI elements
    let hasUITouch = false;
    if (event.touches.length > 0) {
        for (let i = 0; i < event.touches.length; i++) {
            if (isEventOnUIElement(event.touches[i].clientX, event.touches[i].clientY)) {
                hasUITouch = true;
                break;
            }
        }
    }
    
    // If there's a UI touch, don't interfere
    if (hasUITouch) {
        return;
    }
    
    // Stop all loops since we can't easily track which touch ended
    stopAllCellLoops();
    
    event.preventDefault();
}

// === P5.js EVENT HANDLERS (DISABLED ONLY IN INTERACTION MODE) ===

function mousePressed(event) {
    // Only disable p5.js mouse handling when specifically in interaction mode
    if (currentMode === 'interaction' && currentRaga) {
        return; // Let DOM handlers handle this
    }
    
    // Normal p5.js functionality for welcome screen and other modes
    // This allows welcome screen raga card clicking to work
}

function mouseReleased(event) {
    // Only disable p5.js mouse handling when specifically in interaction mode  
    if (currentMode === 'interaction' && currentRaga) {
        return; // Let DOM handlers handle this
    }
    
    // Normal p5.js functionality for welcome screen and other modes
}

function touchStarted() {
    // Only handle touches when specifically in interaction mode with a raga selected
    if (currentMode === 'interaction' && currentRaga) {
        return false; // Let DOM handlers handle this and prevent default
    }
    
    // For welcome screen and other modes, allow normal touch behavior
    // Don't return false - this allows scrolling and normal touch interactions
}

function touchEnded() {
    // Only handle touches when specifically in interaction mode with a raga selected
    if (currentMode === 'interaction' && currentRaga) {
        return false; // Let DOM handlers handle this and prevent default
    }
    
    // For welcome screen and other modes, allow normal touch behavior
    // Don't return false - this allows scrolling and normal touch interactions
}

function getCellFromCoordinates(x, y) {
    if (!grid || grid.length === 0) return null;
    
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            const distance = dist(x, y, cell.x, cell.y);
            
            if (distance < cellSize / 2) {
                return {
                    cell: cell,
                    id: `${row}-${col}`,
                    row: row,
                    col: col
                };
            }
        }
    }
    return null;
}

function startCellLoop(cellInfo) {
    const cellId = cellInfo.id;
    
    // Don't start if already playing
    if (activeCellLoops.has(cellId)) {
        return;
    }
    
    // Ensure Tone.js is started
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    
    // Generate unique melody for this cell, starting with the cell's visual note
    const pattern = generateUniqueMelodyWFC(cellId, currentRaga, cellInfo.cell.midiNote);
    
    console.log(`Starting loop for cell ${cellId}`, pattern);
    console.log('GuitarSampler state:', {
        loaded: guitarSampler ? guitarSampler.loaded : 'undefined',
        volume: guitarSampler ? guitarSampler.volume.value : 'undefined',
        disposed: guitarSampler ? guitarSampler.disposed : 'undefined'
    });
    
    // Test the sampler directly
    if (guitarSampler && guitarSampler.loaded) {
        try {
            console.log('Testing guitarSampler with C4...');
            guitarSampler.triggerAttackRelease('C4', '8n', '+0', 0.5);
        } catch (error) {
            console.error("❌ Error testing guitar sampler:", error);
        }
    } else {
        console.warn("🎸 Guitar sampler not ready for testing");
    }
    
    // Light up the cell
    cellInfo.cell.litAmount = 1.0;
    
    // Create a simple looping system using setTimeout instead of Tone.Sequence
    let currentStep = 0;
    
    // Calculate step duration based on the pattern's time signature
    // Base timing: 120 BPM = 500ms per quarter note = 250ms per 8th note
    const baseBPM = 120;
    const eighthNoteDuration = (60000 / baseBPM) / 2; // 250ms at 120 BPM
    const stepDuration = eighthNoteDuration; // Each step is an 8th note
    
    function playStep() {
        const loopData = activeCellLoops.get(cellId);
        if (!loopData || !loopData.isPlaying) {
            return; // Loop was stopped, exit
        }
        
        const note = pattern[currentStep];
        
        if (note && note.midiNote && guitarSampler && guitarSampler.loaded) {
            try {
                // Play the note - let Tone.js handle transposition
                const noteName = Tone.Frequency(note.midiNote, "midi").toNote();
                guitarSampler.triggerAttackRelease(noteName, "8n", "+0", note.velocity / 127);
                
                // Light up the note
                lightUpNote(note.midiNote, 200);
                
                // Keep the cell lit while playing
                cellInfo.cell.litAmount = 0.8;
            } catch (error) {
                console.error("❌ Error playing cell loop note:", error);
            }
        }
        
        // Move to next step
        currentStep = (currentStep + 1) % pattern.length;
        
        // Schedule next step based on the pattern's time signature
        if (loopData && loopData.isPlaying) {
            loopData.timeoutId = setTimeout(playStep, stepDuration);
        }
    }
    
    // Store the active loop
    activeCellLoops.set(cellId, {
        pattern: pattern,
        cell: cellInfo.cell,
        isPlaying: true,
        timeoutId: null
    });
    
    // Start the loop
    playStep();
}

function stopCellLoop(cellId) {
    const loopData = activeCellLoops.get(cellId);
    
    if (loopData) {
        console.log(`Stopping loop for cell ${cellId}`);
        
        // Mark as not playing
        loopData.isPlaying = false;
        
        // Clear the timeout
        if (loopData.timeoutId) {
            clearTimeout(loopData.timeoutId);
        }
        
        // Fade out the cell lighting
        loopData.cell.litAmount = 0;
        
        // Remove from active loops
        activeCellLoops.delete(cellId);
    }
}

function stopAllCellLoops() {
    activeCellLoops.forEach((loopData, cellId) => {
        stopCellLoop(cellId);
    });
}

// === EXISTING CODE CONTINUATION ===

function drawSheenGrid() {
    textCanvas.push();
    textCanvas.stroke(0, 0, 0, 30); // Thin black lines with some transparency
    textCanvas.strokeWeight(1);
    
    const spacing = 3;

    // Vertical lines
    for (let x = 0; x < textCanvas.width; x += spacing) {
        textCanvas.line(x, 0, x, textCanvas.height);
    }

    // Horizontal lines
    for (let y = 0; y < textCanvas.height; y += spacing) {
        textCanvas.line(0, y, textCanvas.width, y);
    }
    textCanvas.pop();
}

function createGrid() {
    grid = [];
    noteCells = {};
    if (!currentRaga) return;

    // Stop any existing cell loops when creating new grid
    stopAllCellLoops();

    // Collect all possible notes from the raga definition
    const allNotes = [
        ...currentRaga.aaroh,
        ...currentRaga.avroh,
        ...currentRaga.pakad.flat(),
        currentRaga.vadi,
        currentRaga.samavadi
    ].filter(note => note !== null && note !== undefined);

    if (allNotes.length === 0) {
        console.warn("No scale notes found for raga:", currentRaga.name);
        return;
    }
    
    // Use only unique pitch classes, mapped to a single octave for visualization
    const pitchClasses = [...new Set(allNotes.map(n => n % 12))];
    const visualNotes = pitchClasses.map(pc => 60 + pc); // Map to middle octave (C4=60)

    // --- Grid Layout Calculation with Scaling ---
    const textScale = 0.75; // Scale the grid to 90% of the screen
    const gridWidth = width * textScale;
    const gridHeight = height * textScale;
    
    const initialXOffset = (width - gridWidth) / 2;
    const initialYOffset = (height - gridHeight) / 2;

    // Dynamically calculate columns and rows based on scaled dimensions
    gridCols = window.innerWidth > 768 ? 12 : 6;
    cellSize = gridWidth / gridCols;
    const rows = floor(gridHeight / cellSize);
    
    // Center the final grid vertically within the scaled area
    const finalGridHeight = rows * cellSize;
    const finalYOffset = initialYOffset + (gridHeight - finalGridHeight) / 2;


    for (let y = 0; y < rows; y++) {
        let row = [];
        for (let x = 0; x < gridCols; x++) {
            // Select a random note from the single-octave visual set
            const noteIndex = floor(random(visualNotes.length));
            const midiNote = visualNotes[noteIndex];
            
            const cell = {
                x: initialXOffset + x * cellSize + cellSize / 2,
                y: finalYOffset + y * cellSize + cellSize / 2,
                midiNote: midiNote,
                litAmount: 0, // for smooth blinking (0 to 1)
                uniquePattern: null, // Will store WFC-generated pattern
            };
            row.push(cell);
            
            // Map pitch class to the cell for octave-independent lighting
            const pitchClass = midiNote % 12;
            if (!noteCells[pitchClass]) {
                noteCells[pitchClass] = [];
            }
            noteCells[pitchClass].push(cell);
        }
        grid.push(row);
    }
    
    console.log(`Created grid (${gridCols}x${rows}) for raga`, currentRaga.name);
    
    // Only setup cell interactions if we're in interaction mode
    if (currentMode === 'interaction') {
        setupCellInteractions();
    }
}

function drawGrid() {
    if (!currentRaga || grid.length === 0) return;

    // Clear the text canvas before drawing
    textCanvas.clear();

    // Draw the sheen grid on the text canvas, underneath the notes
    drawSheenGrid();
    
    const scheme = currentRaga.colorScheme;
    const accentColor = color(scheme.accent);
    const textColor = color(255); // Use white for notes

    textCanvas.textAlign(CENTER, CENTER);

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = grid[y][x];
            const hindiText = midiToHindi(cell.midiNote);
            
            // Fade out the lit amount
            if (cell.litAmount > 0) {
                cell.litAmount = max(0, cell.litAmount - 0.1); 
            }

            // Apply glow effect via shadow
            if (cell.litAmount > 0) {
                const glowColor = color(accentColor);
                glowColor.setAlpha(cell.litAmount * 150);
                textCanvas.drawingContext.shadowBlur = 20 * cell.litAmount;
                textCanvas.drawingContext.shadowColor = glowColor;
            }

            // Draw the note text
            // Text size grows and alpha increases when lit
            const baseSize = cellSize * noise(cell.x/100, cell.y/100, shaderTime/100.0);
            const size = baseSize + (baseSize * noise(cell.x/100, cell.y/100, shaderTime/100.0) * cell.litAmount);
            textColor.setAlpha(map(cell.litAmount, 0, 1, 150, 255));
            textCanvas.fill(textColor);
            textCanvas.noStroke();
            textCanvas.textSize(size);
            textCanvas.text(hindiText, cell.x, cell.y-size/2);

            // Reset shadow for the next cell to avoid affecting other elements.
            textCanvas.drawingContext.shadowBlur = 0;
        }
    }
}

function generateRagaPalette() {
    if (!currentRaga) return;
  
    const scheme = currentRaga.colorScheme;
    // Define the order of colors for the gradient
    const clr1 = [
      color(scheme.background),
      color(scheme.secondary),
      color(scheme.primary),
      color(scheme.accent),
      color(scheme.text),
    ];
    
    const baseColors = clr1.filter(c => c instanceof p5.Color);
    let clr1Len = baseColors.length;
    if (clr1Len < 2) {
        currentColorPalette = baseColors;
        return;
    }
  
    currentColorPalette = [];
    let colorIndex = 0;
    let transitions = clr1Len - 1;
  
    for (let i = 0; i < transitions; i++) {
      let _c1 = baseColors[i];
      let _c2 = baseColors[i+1];
      // Calculate how many steps for this segment
      let steps = (i === transitions - 1) ? PALETTE_SIZE - colorIndex : Math.floor(PALETTE_SIZE / transitions);
      
      for (let j = 0; j < steps; j++) {
        if (colorIndex >= PALETTE_SIZE) break;
        let amt = j / (steps - 1);
        currentColorPalette[colorIndex] = lerpColor(_c1, _c2, amt);
        colorIndex++;
      }
    }
    
    // Ensure the palette is full
    while (currentColorPalette.length < PALETTE_SIZE) {
      currentColorPalette.push(baseColors[clr1Len-1]);
    }
}

function lightUpNote(noteNumber, durationMs) {
    if (noteNumber === null) return;

    // Using pitch class to light up all octaves of a note
    const pitchClass = noteNumber % 12;
    
    if (noteCells[pitchClass]) {
        const cellsToLight = noteCells[pitchClass];
        cellsToLight.forEach(cell => {
            cell.litAmount = 1.0; // Start blink at full intensity
        });
    }
} 