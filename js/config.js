// Bass samples map
const bassSamplesMap = {
    "A1": "samples/bass/A1.wav",
    "B1": "samples/bass/B1.wav", 
    "C1": "samples/bass/C1.wav",
    "D1": "samples/bass/D1.wav",
    "E1": "samples/bass/E1.wav",
    "F1": "samples/bass/F1.wav",
    "G1": "samples/bass/G1.wav"
};

// Pad samples map
const padSamplesMap = {
    "A1": "samples/pads/A1.wav",
    "B1": "samples/pads/B1.wav",
    "C1": "samples/pads/C1.wav", 
    "D1": "samples/pads/D1.wav",
    "E1": "samples/pads/E1.wav",
    "F1": "samples/pads/F1.wav",
    "G1": "samples/pads/G1.wav"
};

// Cello samples map (using forte downbow samples as default)
const celloSamplesMap = {
    "A1": "samples/Cello/A1_f_d.wav",
    "A2": "samples/Cello/A2_f_d.wav",
    "A3": "samples/Cello/A3_f_d.wav",
    "A4": "samples/Cello/A4_f_d.wav",
    "C1": "samples/Cello/C1_f_d.wav",
    "C2": "samples/Cello/C2_f_d.wav",
    "C3": "samples/Cello/C3_f_d.wav",
    "C4": "samples/Cello/C4_f_d.wav",
    "C5": "samples/Cello/C5_f_d.wav",
    "Eb1": "samples/Cello/Eb1_f_d.wav",
    "Eb2": "samples/Cello/Eb2_f_d.wav", 
    "Eb3": "samples/Cello/Eb3_f_d.wav",
    "Eb4": "samples/Cello/Eb4_f_d.wav",
    "Gb1": "samples/Cello/Gb1_f_d.wav",
    "Gb2": "samples/Cello/Gb2_f_d.wav",
    "Gb3": "samples/Cello/Gb3_f_d.wav",
    "Gb4": "samples/Cello/Gb4_f_d.wav"
};

const guitarSamplesMap = {
    "C1": "samples/guitar/mallet_guitar_C1[2025-07-22162833].wav",
    "C2": "samples/guitar/mallet_guitar_C2[2025-07-22162836].wav",
    "C3": "samples/guitar/mallet_guitar_C3[2025-07-22162837].wav",
    "E1": "samples/guitar/mallet_guitar_E1[2025-07-22162831].wav",
    "E2": "samples/guitar/mallet_guitar_E2[2025-07-22162829].wav",
    "E3": "samples/guitar/mallet_guitar_E3[2025-07-22162828].wav",
    "G1": "samples/guitar/mallet_guitar_G1[2025-07-22162822].wav",
    "G2": "samples/guitar/mallet_guitar_G2[2025-07-22162824].wav",
    "G3": "samples/guitar/mallet_guitar_G3[2025-07-22162826].wav",
    "A#0": "samples/guitar/mallet_guitar_Bb0[2025-07-22162844].wav"
};

const drumKit2Samples = {
    'C1': 'samples/drums2/Ghosthack-Kick_01.wav',
    'D1': 'samples/drums2/Ghosthack-Snare_01.wav',
    'D#1': 'samples/drums2/Ghosthack-Clap_01.wav',
    'F#1': 'samples/drums2/Ghosthack-Ride_01.wav'
};

const hiHatKit2Samples = {
    'C2': 'samples/drums2/Ghosthack-Open_Hihat_01.wav',
    'C#2': 'samples/drums2/Ghosthack-Closed_Hihat_01.wav'
};

const drumSamples = {
    'C1': 'samples/drums/Kick_Extra_Vergine_1.wav',    // kick
    'C#1': 'samples/drums/Bass_Extra_Vergine_1.wav',   // bass drum
    'D1': 'samples/drums/Snare_Extra_Vergine_1.wav',   // snare
    'D#1': 'samples/drums/Snap_Extra_Vergine_1.wav',   // snap/clap
    'E1': 'samples/drums/Perc_Extra_Vergine_1.wav',    // percussion 1
    'G1': 'samples/drums/FX_Extra_Vergine_2.wav',      // FX 1
    'A1': 'samples/drums/Gong_Extra_Vergine_1.wav',    // gong
    'A#1': 'samples/drums/Zipper_Extra_Vergine_1.wav'  // zipper FX
};
  
const hiHatSamples = {
    'C2': 'samples/drums/Open_HH_Extra_Vergine_1.wav', // open hi-hat
    'D2': 'samples/drums/Snare_Extra_Vergine_2.wav',   // snare variation
};

// Tabla patterns removed - no tabla samples available
// Generative patterns will replace the static ones below.

const PALETTE_SIZE = 256; // Number of colors to generate for the palette

const timeSignatures = [
    { beats: 1, subdivision: 4 },
    { beats: 2, subdivision: 4 },
    { beats: 3, subdivision: 4 },
    { beats: 4, subdivision: 4 },
    //{ beats: 7, subdivision: 8 },
];

const tihaiPatterns = [
    [1,1,2,2,1,1,2,2,1,1,2,2],
    [3,3,4,4,3,3,4,4,3,3,4,4],
];

const fastRhythmPatterns = [
    { pattern: [0,1,0,1], noteOffset: [0,2], length: 4 },
    { pattern: [0,2,0,2], noteOffset: [0,4], length: 4 },
    { pattern: [1,3,1,3], noteOffset: [2,5], length: 4 },
];

const defaultColorScheme = {
    background: '#000000',
    primary: '#36454F',
    secondary: '#E6E6FA',
    accent: '#6A5ACD',
    text: '#F8F8FF'
};

const defaultDrumPattern = {
    "C1": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    "D1": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    "hats": [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1],
    "perc": [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0]
}; 