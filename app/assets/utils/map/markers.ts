import { darkenColor, lightenColor } from "~/assets/utils/shared/colors";

export const generateTruckIcon = (
    arrowColor: string,
    discColor: string,
    rimColor: string,
): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const dark = darkenColor(arrowColor, 0.05);

        // Scale by 3 for perfectly crisp rendering on Retina/high-DPI displays
        const scale = 3;
        const size = 40;

        const svgString = `
            <svg width="${size * scale}" height="${
            size * scale
        }" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" fill="${discColor}"/>

                <path 
                    d="M19.12 39.175L29.2716 16.9684C30.3399 14.6315 33.6601 14.6315 34.7284 16.9684L44.88 39.175C46.0062 41.6385 43.549 44.215 41.0349 43.2067L33.1167 40.0312C32.4 39.7437 31.6 39.7437 30.8833 40.0312L22.9651 43.2067C20.451 44.215 17.9938 41.6385 19.12 39.175Z" 
                    fill="${dark}"
                />
            </svg>
        `;

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    });
};

export const generateDestinationIcon = (
    baseColor: string,
): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const dark = darkenColor(baseColor, 0.2);
        const lightInner = lightenColor(baseColor, 0.05);

        // Also scale the destination pin so it perfectly matches the crispness of the truck
        const scale = 3;
        const width = 28;
        const height = 36;

        const svgString = `
        <svg width="${width * scale}" height="${
            height * scale
        }" viewBox="-4 -4 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.25"/>
                </filter>
            </defs>
            <g filter="url(#pin-shadow)">
                <path d="M16 42 C16 42 32 26 32 16 C32 7.6 24.837 0 16 0 C7.6 0 0 7.6 0 16 C0 26 16 42 16 42 Z" fill="${lightInner}" />
                
                <!-- Middle Darker Ring -->
                <circle cx="16" cy="16" r="11" fill="${dark}" />
                
                <!-- Innermost White Circle -->
                <circle cx="16" cy="16" r="4.5" fill="#fafafa" />
            </g>
        </svg>`;

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    });
};
