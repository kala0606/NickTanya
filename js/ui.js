let experienceStartTime;

function selectRaga(ragaName) {
    if (allRagas[ragaName] && (!currentRaga || currentRaga.name !== ragaName)) {
      // This function can be repurposed for manual selection later if needed.
      // For now, startExperience handles the initial selection.
      startExperience(ragaName);
    }
}
  
function populateWelcomeScreen() {
    console.log("🎭 Starting populateWelcomeScreen()");
    
    const timeSlot = getSuggestionsForCurrentTime();
    console.log("⏰ Time slot result:", timeSlot);
    
    const container = select('#raga-suggestions');
    const welcomeTitle = select('.welcome-container h1');
    const welcomeSubtitle = select('.welcome-subtitle');

    if (!timeSlot || timeSlot.moods.length === 0) {
        console.log("⚠️ No time slot found, showing all available ragas");
        welcomeTitle.html('Welcome to Raga.fm');
        welcomeSubtitle.html('Choose from our collection of ragas:');
        
        // Show all available ragas
        let content = '<div class="mood-section"><h2 class="mood-title">All Available Ragas</h2><div class="raga-cards-container">';
        
        Object.keys(allRagas).forEach(ragaName => {
            const raga = allRagas[ragaName];
            console.log("🎵 Adding fallback raga card:", ragaName);
            content += `
                <div class="raga-card" data-raga-name="${ragaName}">
                    <h3>${ragaName}</h3>
                    <p>${raga.description || 'A beautiful classical raga'}</p>
                </div>
            `;
        });
        
        content += '</div></div>';
        console.log("📝 Setting fallback container HTML with content length:", content.length);
        container.html(content);
        
        // Add event listeners
        const cards = selectAll('.raga-card');
        console.log("🃏 Found", cards.length, "fallback raga cards to add listeners to");
        
        cards.forEach(card => {
            card.elt.addEventListener('click', () => startExperience(card.elt.getAttribute('data-raga-name')));
        });
        
        console.log("✅ Fallback welcome screen populated successfully");
        return;
    }

    console.log("🎨 Found moods:", timeSlot.moods.length);
    // welcomeSubtitle.html(`Based on the time of day (${timeSlot.time_slot}), here are some suggested Ragas for you.`);

    let content = '';
    timeSlot.moods.forEach(mood => {
        console.log("🎪 Processing mood:", mood.name, "with", mood.ragas.length, "ragas");
        content += `<div class="mood-section">`;
        content += `<h2 class="mood-title" style="color: ${mood.color_scheme.accent}">${mood.name}</h2>`;
        content += `<div class="raga-cards-container">`;
        mood.ragas.forEach(raga => {
            console.log("🎵 Adding raga card:", raga.name);
            content += `
                <div class="raga-card" data-raga-name="${raga.name}">
                    <h3>${raga.name}</h3>
                    <p>${raga.description}</p>
                </div>
            `;
        });
        content += `</div></div>`;
    });
    
    console.log("📝 Setting container HTML with content length:", content.length);
    container.html(content);

    // Add event listeners to the newly created cards.
    // We must access the underlying DOM element (.elt) for addEventListener to work.
    const cards = selectAll('.raga-card');
    console.log("🃏 Found", cards.length, "raga cards to add listeners to");
    
    cards.forEach(card => {
        card.elt.addEventListener('click', () => startExperience(card.elt.getAttribute('data-raga-name')));
    });
    
    console.log("✅ Welcome screen populated successfully");
}

function applyColorScheme(scheme) {
    const root = document.documentElement;
    root.style.setProperty('--background-color', scheme.background);
    root.style.setProperty('--primary-color', scheme.primary);
    root.style.setProperty('--secondary-color', scheme.secondary);
    root.style.setProperty('--accent-color', scheme.accent);
    root.style.setProperty('--text-color', scheme.text);
}

function startExperience(ragaName) {
    if (!allRagas[ragaName]) {
        console.error("Selected raga not found:", ragaName);
        // Fallback to the very first raga if the provided one is invalid
        const firstName = Object.keys(allRagas)[0];
        if (!firstName) {
            console.error("No ragas available at all.");
            return;
        }
        currentRaga = allRagas[firstName];
    } else {
        currentRaga = allRagas[ragaName];
    }
    
    experienceStartTime = new Date(); // Start the timer
    
    console.log("▶ Starting Raga:", currentRaga.name);

    // Track the raga selection with Microsoft Clarity
    if (typeof clarity === 'function') {
        clarity('set', 'selected_raga', ragaName);
        clarity('event', 'Raga Selected');
    }

    applyColorScheme(currentRaga.colorScheme);
    applyUIColor(color(255)); // Use white for UI elements
    select('#raga-name-display').html(currentRaga.name);
    
    // Generate the color palette for the selected raga
    generateRagaPalette();

    // Initial setup for the selected raga
    resetPlaybackState();
    updatePlaybackParameters();
    generateSequence();
    generateHousePattern();
    // Tabla pattern generation removed - no tabla samples available
    chooseNextChordInterval();
    createGrid();
    
    // Hide welcome screen and show the controls
    select('#welcome-screen').addClass('hidden');
    select('#app').removeClass('hidden');
    select('.top-bar').removeClass('hidden');
    document.body.classList.add('experience-view');

    // Start playback
    if (!isPlaying) {
        togglePlayback();
    }
}

function goToWelcomeScreen() {
    if (isPlaying) {
        togglePlayback(); // This will stop the music and release notes
    }

    // Stop all cell loops and dispose resources
    if (typeof stopAllCellLoops === 'function') {
        stopAllCellLoops();
    }

    // Track experience duration with Microsoft Clarity
    if (typeof clarity === 'function' && experienceStartTime) {
        const durationInSeconds = (new Date() - experienceStartTime) / 1000;
        clarity('set', 'experience_duration_seconds', Math.round(durationInSeconds).toString());
        clarity('event', 'Experience Ended');
    }

    // Reset state
    currentRaga = null;
    grid = [];
    noteCells = {};
    
    // Clear the canvas
    clear();
    background(0); // Set a neutral background

    // Restore default color scheme
    applyColorScheme(defaultColorScheme);

    // Show welcome screen and hide the main interface
    select('#welcome-screen').removeClass('hidden');
    select('#app').addClass('hidden');
    select('.top-bar').addClass('hidden');
    select('#back-button').addClass('hidden');
    select('#raga-name-display').html('raga.fm'); // Reset title
    document.body.classList.remove('experience-view');
    applyUIColor(null); // Revert to default
}

function applyUIColor(colorObj) {
    const ragaName = document.getElementById('raga-name-display');
    const appLogo = document.getElementById('app-logo');
    const backButton = document.getElementById('back-button');
    const startStopButton = document.getElementById('start-stop-button');
    const modeToggleButton = document.getElementById('mode-toggle');

    const targetColorStr = colorObj ? colorObj.toString('#rrggbb') : '#ffffff';

    if (ragaName) ragaName.style.color = targetColorStr;
    if (appLogo) appLogo.style.backgroundColor = targetColorStr;
    if (backButton) {
        backButton.style.color = targetColorStr;
        backButton.style.borderColor = targetColorStr;
    }
    
    if (startStopButton) {
        startStopButton.style.borderColor = targetColorStr;
        const playIcon = startStopButton.querySelector('.icon-play');
        if (playIcon) playIcon.style.borderLeftColor = targetColorStr;

        const pauseIcon = startStopButton.querySelector('.icon-pause');
        if (pauseIcon) {
            pauseIcon.style.borderLeftColor = targetColorStr;
            pauseIcon.style.borderRightColor = targetColorStr;
        }
    }

    if (modeToggleButton) {
        modeToggleButton.style.color = targetColorStr;
        modeToggleButton.style.borderColor = targetColorStr;
    }
} 