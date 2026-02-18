//// COLORS
/// #7c3aed
/// #FFD700
/// #22d3ee
/// #60a5fa

import { reactive } from "vue";

export const AppSettings = reactive({
    appName: "TruckNav",
    theme: {
        defaultColor: "#7c3aed",
        darkMode: true,
    },
});

if (typeof window !== "undefined") {
    const savedColor = localStorage.getItem("truck-nav-theme");
    if (savedColor) {
        AppSettings.theme.defaultColor = savedColor;
        document.documentElement.style.setProperty("--theme-color", savedColor);
    }
}
