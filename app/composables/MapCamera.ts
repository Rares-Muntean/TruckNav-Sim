import { ref, onUnmounted } from "vue";
import type { Ref } from "vue";
import type { Map } from "maplibre-gl";

export const useMapCamera = (map: Ref<Map | null>) => {
    const isCameraLocked = ref(false);
    const isAutoFollowEnabled = ref(false);
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

    let autoLockTimer: ReturnType<typeof setTimeout> | null = null;

    let markerEl: HTMLDivElement | null = null;

    const initMarker = (imgSrc: string, size: number) => {
        if (!map.value) return;
        if (!markerEl) {
            markerEl = document.createElement("div");
            markerEl.style.position = "absolute";
            markerEl.style.top = "0";
            markerEl.style.left = "0";

            markerEl.style.width = `${size}px`;
            markerEl.style.height = `${size}px`;

            markerEl.style.backgroundImage = `url("${imgSrc}")`;
            markerEl.style.backgroundSize = "contain";
            markerEl.style.backgroundRepeat = "no-repeat";
            markerEl.style.backgroundPosition = "center";
            markerEl.style.pointerEvents = "none";
            markerEl.style.zIndex = "10";
            markerEl.style.willChange = "transform";
            markerEl.style.filter =
                "drop-shadow(0px 6px 6px rgba(0, 0, 0, 0.17))";

            markerEl.className = "truck-nav-marker";

            markerEl.style.display = "none";

            map.value.getContainer().appendChild(markerEl);
        }
    };

    const updateMarkerSize = (size: number) => {
        if (markerEl) {
            markerEl.style.width = `${size}px`;
            markerEl.style.height = `${size}px`;
        }
    };

    const updateMarkerImage = (imgSrc: string) => {
        if (markerEl) {
            markerEl.style.backgroundImage = `url("${imgSrc}")`;
        }
    };

    const getNavPadding = () => {
        if (!map.value) return { top: 0, bottom: 0, left: 0, right: 0 };

        const container = map.value.getContainer();
        const height = container.clientHeight;
        const width = container.clientWidth;
        const isLandscape = width > height;

        const topRatio = isLandscape ? 0.3 : 0.4;

        return {
            top: Math.round(height * topRatio),
            bottom: 0,
            left: 0,
            right: 0,
        };
    };

    const getPadding = () => {
        if (!isNavigating.value) {
            return { top: 0, bottom: 0, left: 0, right: 0 };
        }

        return getNavPadding();
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
                    bearing: isAutoFollowEnabled.value
                        ? currentTruckHeading
                        : 0,
                    padding: getPadding(),
                });
            }

            if (markerEl) {
                if (isTargetAtOrigin) {
                    markerEl.style.display = "none";
                } else {
                    markerEl.style.display = "block";

                    const pos = map.value.project(currentTruckCoords);
                    const pitch = map.value.getPitch();
                    const bearing = map.value.getBearing();

                    const screenRot = currentTruckHeading - bearing;
                    const effectivePitch = pitch * 0.83;

                    markerEl.style.transform = `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotateX(${effectivePitch}deg) rotateZ(${screenRot}deg)`;
                }
            }
        } else {
            if (markerEl) {
                markerEl.style.display = "none";
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

    const resetTruck = () => {
        targetCoords = null;
        previousCoords = null;
        currentTruckCoords = null;
        if (markerEl) {
            markerEl.style.display = "none";
        }
    };

    const initCameraListeners = () => {
        if (!map.value) return;
        startRenderLoop();

        const breakLockEvents = ["mousedown", "touchstart", "wheel"];

        breakLockEvents.forEach((event) => {
            map.value!.on(event, (e) => {
                if (e.originalEvent && !isEasing) {
                    isCameraLocked.value = false;
                    if (autoLockTimer) clearTimeout(autoLockTimer);

                    if (isAutoFollowEnabled.value) {
                        autoLockTimer = setTimeout(() => {
                            resumeCameraLock();
                        }, 1500);
                    }
                }
            });
        });

        map.value.on("move", (e) => {
            if (e.originalEvent && !isCameraLocked.value && !isEasing) {
                if (autoLockTimer) clearTimeout(autoLockTimer);

                if (isAutoFollowEnabled.value) {
                    autoLockTimer = setTimeout(() => {
                        resumeCameraLock();
                    }, 1500);
                }
            }
        });
    };

    const resumeCameraLock = (isFollowButtonEnabled?: boolean) => {
        if (!map.value || !currentTruckCoords) return;
        isAutoFollowEnabled.value = isFollowButtonEnabled ?? true;
        isCameraLocked.value = true;
        isEasing = true;

        if (easeTimeout) clearTimeout(easeTimeout);
        easeTimeout = setTimeout(() => {
            isEasing = false;
        }, 500);

        map.value.easeTo({
            center: currentTruckCoords,
            bearing: currentTruckHeading,
            pitch: map.value.getPitch(),
            zoom: map.value.getZoom(),
            duration: 350,
            padding: getPadding(),
        });
    };

    const toggleAutoFollow = () => {
        isAutoFollowEnabled.value = !isAutoFollowEnabled.value;

        if (isAutoFollowEnabled.value) {
            resumeCameraLock();
        } else {
            isCameraLocked.value = false;
            if (autoLockTimer) clearTimeout(autoLockTimer);
        }
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
        isAutoFollowEnabled.value = true;
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
            pitch: 50,
            duration: 350,
            padding: getPadding(),
        });
    };

    const stopNavigationMode = () => {
        if (!map.value || !currentTruckCoords) return;
        isNavigating.value = false;

        resumeCameraLock(false);
    };

    onUnmounted(() => {
        stopRenderLoop();
        if (easeTimeout) clearTimeout(easeTimeout);
        if (markerEl) markerEl.remove();
    });

    return {
        isCameraLocked,
        isNavigating,
        isAutoFollowEnabled,
        initMarker,
        updateMarkerSize,
        updateMarkerImage,
        initCameraListeners,
        followTruck,
        stopNavigationMode,
        resumeCameraLock,
        toggleAutoFollow,
        lockCamera,
        startNavigationMode,
        resetTruck,
    };
};
