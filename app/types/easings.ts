export const EASE = {
    none: [0, 0, 1, 1],

    // --- POWER 1 (Quad) ---
    power1In: [0.11, 0, 0.5, 0],
    power1Out: [0.25, 1, 0.5, 1],
    power1InOut: [0.45, 0, 0.55, 1],

    // --- POWER 2 (Cubic) ---
    power2In: [0.32, 0, 0.67, 0],
    power2Out: [0.33, 1, 0.68, 1],
    power2InOut: [0.65, 0, 0.35, 1],

    // --- POWER 3 (Quart) ---
    power3In: [0.5, 0, 0.75, 0],
    power3Out: [0.16, 1, 0.3, 1],
    power3InOut: [0.76, 0, 0.24, 1],

    // --- POWER 4 (Quint) ---
    power4In: [0.64, 0, 0.78, 0],
    power4Out: [0.22, 1, 0.36, 1],
    power4InOut: [0.83, 0, 0.17, 1],

    // --- SINE (Very gentle) ---
    sineIn: [0.12, 0, 0.39, 0],
    sineOut: [0.61, 1, 0.88, 1],
    sineInOut: [0.37, 0, 0.63, 1],

    // --- EXPO (Snappy & sharp) ---
    expoIn: [0.7, 0, 0.84, 0],
    expoOut: [0.16, 1, 0.3, 1],
    expoInOut: [0.87, 0, 0.13, 1],

    // --- CIRC (Sudden stop/start) ---
    circIn: [0.55, 0, 1, 0.45],
    circOut: [0, 0.55, 0.45, 1],
    circInOut: [0.85, 0, 0.15, 1],

    // --- BACK (Overshoot / Anticipation) ---
    backIn: [0.36, 0, 0.66, -0.56],
    backOut: [0.34, 1.56, 0.64, 1],
    backOutSubtle: [0.34, 1.25, 0.64, 1],
    backInOut: [0.68, -0.6, 0.32, 1.6],
} as const;

export type EaseKey = keyof typeof EASE;
