import { ref, onUnmounted } from "vue";
import type { Ref } from "vue";
import type { Map } from "maplibre-gl";

const PADDING_NAV = { top: 180, bottom: 0, left: 0, right: 0 };
const PADDING_FREE = { top: 0, bottom: 0, left: 0, right: 0 };

export const useMapCamera = (map: Ref<Map | null>) => {
    const isCameraLocked = ref(false);
    const isNavigating = ref(false);

    let targetCoords: [number, number] | null = null;
    let targetHeading: number = 0;

    let previousCoords: [number, number] | null = null;
    let previousHeading: number = 0;
    let lastTargetUpdateTime: number = 0;

    let currentTruckCoords: [number, number] | null = null;
    let currentTruckHeading: number = 0;

    let animationFrameId: number | null = null;
    let isEasing = false;
    let easeTimeout: ReturnType<typeof setTimeout> | null = null;

    let markerEl: HTMLDivElement | null = null;

    const initMarker = (imgSrc: string) => {
        if (!map.value) return;
        if (!markerEl) {
            markerEl = document.createElement("div");
            markerEl.style.position = "absolute";
            markerEl.style.top = "0";
            markerEl.style.left = "0";
            markerEl.style.width = "40px";
            markerEl.style.height = "40px";
            markerEl.style.backgroundImage = `url("${imgSrc}")`;
            markerEl.style.backgroundSize = "contain";
            markerEl.style.backgroundRepeat = "no-repeat";
            markerEl.style.backgroundPosition = "center";
            markerEl.style.pointerEvents = "none";
            markerEl.style.zIndex = "10";
            markerEl.style.willChange = "transform";

            map.value.getContainer().appendChild(markerEl);
        }
    };

    const updateMarkerImage = (imgSrc: string) => {
        if (markerEl) {
            markerEl.style.backgroundImage = `url("${imgSrc}")`;
        }
    };

    const renderLoop = (timestamp: number) => {
        const now = performance.now();

        if (map.value && targetCoords && previousCoords && currentTruckCoords) {
            const elapsed = now - lastTargetUpdateTime;
            let progress = Math.min(elapsed / 120, 1);

            currentTruckCoords[0] =
                previousCoords[0] +
                (targetCoords[0] - previousCoords[0]) * progress;
            currentTruckCoords[1] =
                previousCoords[1] +
                (targetCoords[1] - previousCoords[1]) * progress;
            currentTruckHeading =
                previousHeading + (targetHeading - previousHeading) * progress;

            const isTargetAtOrigin =
                targetCoords[0] === 0 && targetCoords[1] === 0;

            if (isCameraLocked.value && !isEasing && !isTargetAtOrigin) {
                map.value.jumpTo({
                    center: [currentTruckCoords[0], currentTruckCoords[1]],
                    bearing: isNavigating.value
                        ? currentTruckHeading
                        : map.value.getBearing(),
                    padding: isNavigating.value ? PADDING_NAV : PADDING_FREE,
                });
            }

            if (markerEl && !isTargetAtOrigin) {
                const pos = map.value.project(currentTruckCoords);
                const pitch = map.value.getPitch();
                const bearing = map.value.getBearing();

                const screenRot = currentTruckHeading - bearing;

                markerEl.style.transform = `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotateX(${pitch}deg) rotateZ(${screenRot}deg)`;
            }
        }

        animationFrameId = requestAnimationFrame(renderLoop);
    };

    const startRenderLoop = () => {
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(renderLoop);
        }
    };

    const stopRenderLoop = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };

    const breakLockEvents = [
        "pointerdown",
        "mousedown",
        "touchstart",
        "wheel",
        "pitchstart",
        "boxzoomstart",
    ];

    const initCameraListeners = () => {
        if (!map.value) return;

        startRenderLoop();

        breakLockEvents.forEach((event) => {
            map.value!.on(event, () => {
                if (isEasing) return;
                if (isCameraLocked.value) isCameraLocked.value = false;
            });
        });
    };

    const followTruck = (coords: [number, number], heading: number) => {
        if (!map.value) return;

        if (currentTruckCoords) {
            previousCoords = [...currentTruckCoords] as [number, number];
            previousHeading = currentTruckHeading;
        } else {
            previousCoords = [...coords] as [number, number];
            previousHeading = heading;
            currentTruckCoords = [...coords] as [number, number];
            currentTruckHeading = heading;
        }

        targetCoords = [...coords] as [number, number];

        let hDiff = heading - previousHeading;
        while (hDiff < -180) hDiff += 360;
        while (hDiff > 180) hDiff -= 360;
        targetHeading = previousHeading + hDiff;

        lastTargetUpdateTime = performance.now();
    };

    const lockCamera = () => {
        if (!map.value) return;
        isCameraLocked.value = true;
    };

    const startNavigationMode = (coords: [number, number], heading: number) => {
        if (!map.value) return;
        isNavigating.value = true;
        isCameraLocked.value = true;
        targetCoords = coords;
        targetHeading = heading;

        isEasing = true;
        if (easeTimeout) clearTimeout(easeTimeout);

        easeTimeout = setTimeout(() => {
            isEasing = false;
        }, 300);

        map.value.easeTo({
            center: coords,
            bearing: isNavigating.value ? heading : 0,
            zoom: 11,
            pitch: 38,
            duration: 300,
            padding: PADDING_NAV,
        });
    };

    onUnmounted(() => {
        stopRenderLoop();
        if (easeTimeout) clearTimeout(easeTimeout);
        if (markerEl) markerEl.remove();
    });

    return {
        isCameraLocked,
        isNavigating,
        initMarker,
        updateMarkerImage,
        initCameraListeners,
        followTruck,
        lockCamera,
        startNavigationMode,
    };
};
