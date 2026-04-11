import { darkenColor, lightenColor } from "~/assets/utils/shared/colors";

export const generateTruckIcon = (
    baseColor: string,
): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const dark = darkenColor(baseColor, 0.1);
        const light = lightenColor(baseColor, 0.23);

        // Scale by 3 for perfectly crisp rendering on Retina/high-DPI displays
        const scale = 3;
        const size = 40;

        // Note: viewBox expanded to "-15 -15 130 130" to accommodate the shadow
        const svgString = `
            <svg width="${size * scale}" height="${size * scale}" viewBox="-15 -15 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="truck-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="50%" stop-color="${dark}" />
                        <stop offset="50%" stop-color="${light}" />
                    </linearGradient>
                    
                    <!-- Clean Drop Shadow -->
                    <filter id="truck-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.35" />
                    </filter>
                </defs>
                <path 
                    d="M50 10 L90 85 L50 70 L10 85 Z" 
                    fill="url(#truck-grad)" 
                    stroke="url(#truck-grad)" 
                    stroke-width="12" 
                    stroke-linejoin="round" 
                    paint-order="stroke fill"
                    filter="url(#truck-shadow)"
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
        <svg width="${width * scale}" height="${height * scale}" viewBox="-4 -4 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export const generateWaypointIcon = (
    number: number,
    baseColor: string,
): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const dark = darkenColor(baseColor, 0.2);
        const scale = 3;
        const width = 28;
        const height = 36;
        const svgString = `
        <svg width="${width * scale}" height="${height * scale}" viewBox="-4 -4 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.25"/>
                </filter>
            </defs>
            <g filter="url(#pin-shadow)">
                <path d="M16 42 C16 42 32 26 32 16 C32 7.6 24.837 0 16 0 C7.6 0 0 7.6 0 16 C0 26 16 42 16 42 Z" fill="${dark}" />
                <circle cx="16" cy="16" r="11" fill="#1d2833" />
                <text x="16" y="21" text-anchor="middle" font-size="13" font-weight="700" font-family="Arial" fill="#f2f2f2">${number}</text>
            </g>
        </svg>`;
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    });
};