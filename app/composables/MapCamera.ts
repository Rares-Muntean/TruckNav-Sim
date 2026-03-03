import { Map } from "maplibre-gl";
import { setMapLibreData } from "~/assets/utils/map/helpers";

const PADDING_NAV = { top: 180, bottom: 0, left: 0, right: 0 };
const PADDING_FREE = { top: 0, bottom: 0, left: 0, right: 0 };

export const useMapCamera = (map: Ref<Map | null>) => {
    const isCameraLocked = ref(false);
    const isNavigating = ref(false);

    let targetCoords: [number, number] | null = null;
    let targetHeading: number = 0;
    let animationFrameId: number | null = null;

    let currentTruckCoords: [number, number] | null = null;
    let currentTruckHeading: number = 0;

    let isEasing = false;
    let easeTimeout: ReturnType<typeof setTimeout> | null = null;

    let lastTime = 0;

    const renderLoop = (timestamp: number) => {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        const dt = Math.min(deltaTime, 100);
        const lerpFactor = 1 - Math.pow(0.8, dt / 16.666);

        let iconMoved = false;

        if (map.value && targetCoords) {
            if (!currentTruckCoords) {
                currentTruckCoords = [...targetCoords] as [number, number];
                currentTruckHeading = targetHeading;
                iconMoved = true;
            } else {
                const diffX = targetCoords[0] - currentTruckCoords[0];
                const diffY = targetCoords[1] - currentTruckCoords[1];

                let hDiff = targetHeading - currentTruckHeading;
                while (hDiff < -180) hDiff += 360;
                while (hDiff > 180) hDiff -= 360;

                if (
                    Math.abs(diffX) > 0.000002 ||
                    Math.abs(diffY) > 0.000002 ||
                    Math.abs(hDiff) > 0.1
                ) {
                    currentTruckCoords[0] += diffX * lerpFactor;
                    currentTruckCoords[1] += diffY * lerpFactor;
                    currentTruckHeading += hDiff * lerpFactor;
                    iconMoved = true;
                } else {
                    currentTruckCoords[0] = targetCoords[0];
                    currentTruckCoords[1] = targetCoords[1];
                    currentTruckHeading = targetHeading;
                }
            }
            if (iconMoved) {
                setMapLibreData(
                    map.value,
                    "truck-source",
                    "Point",
                    currentTruckCoords,
                    { heading: currentTruckHeading },
                );
            }
        }

        const isTargetAtOrigin =
            targetCoords && targetCoords[0] === 0 && targetCoords[1] === 0;

        if (
            isCameraLocked.value &&
            map.value &&
            currentTruckCoords &&
            !isEasing &&
            !isTargetAtOrigin
        ) {
            const currentCenter = map.value.getCenter();
            const currentBearing = map.value.getBearing();

            const diffX = currentTruckCoords[0] - currentCenter.lng;
            const diffY = currentTruckCoords[1] - currentCenter.lat;

            const targetCamBearing = isNavigating.value
                ? currentTruckHeading
                : 0;
            let cDiff = targetCamBearing - currentBearing;
            while (cDiff < -180) cDiff += 360;
            while (cDiff > 180) cDiff -= 360;

            if (
                Math.abs(diffX) > 0.000002 ||
                Math.abs(diffY) > 0.000002 ||
                Math.abs(cDiff) > 0.5
            ) {
                map.value.jumpTo({
                    center: [currentTruckCoords[0], currentTruckCoords[1]],
                    bearing: currentBearing + cDiff,
                    padding: isNavigating.value ? PADDING_NAV : PADDING_FREE,
                });
            }
        }

        animationFrameId = requestAnimationFrame(renderLoop);
    };

    const startRenderLoop = () => {
        if (!animationFrameId) {
            lastTime = 0;
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
            map.value!.on(event, (e: any) => {
                if (isEasing) return;
                if (isCameraLocked.value) {
                    isCameraLocked.value = false;
                }
            });
        });
    };

    const followTruck = (coords: [number, number], heading: number) => {
        if (!map.value) return;
        targetCoords = coords;
        targetHeading = heading;
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
    });

    return {
        isCameraLocked,
        isNavigating,
        initCameraListeners,
        followTruck,
        lockCamera,
        startNavigationMode,
    };
};
