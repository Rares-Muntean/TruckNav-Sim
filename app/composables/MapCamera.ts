import { ref, onUnmounted } from "vue";
import type { Ref } from "vue";
import type { Map } from "maplibre-gl";

export const useMapCamera = (map: Ref<Map | null>) => {
    const isCameraLocked = ref(false);
    const isNavigating = ref(false);

    const isHeadingActive = ref(false);
    const isNorthActive = ref(false);

    let targetCoords: [number, number] | null = null;
    let targetHeading: number = 0;

    let previousCoords: [number, number] | null = null;
    let previousHeading: number = 0;
    let lastTargetUpdateTime: number = 0;

    let currentTruckCoords: [number, number] | null = null;
    let currentTruckHeading: number = 0;

    let animationFrameId: number | null = null;
    let easeTimeout: ReturnType<typeof setTimeout> | null = null;

    let easingUntil = 0;
    let autoLockTimer: ReturnType<typeof setTimeout> | null = null;

    let markerEl: HTMLDivElement | null = null;

    const initMarker = (imgSrc: string, size: number) => {
        if (!map.value) return;
        if (!markerEl) {
            markerEl = document.createElement("div");
            markerEl.style.position = "absolute";
            markerEl.className = "truck-nav-marker";
            markerEl.style.top = "0";
            markerEl.style.left = "0";
            markerEl.style.borderRadius = "50%";

            markerEl.style.width = `${size}px`;
            markerEl.style.height = `${size}px`;

            markerEl.style.backgroundImage = `url("${imgSrc}")`;
            markerEl.style.backgroundSize = "contain";
            markerEl.style.backgroundRepeat = "no-repeat";
            markerEl.style.backgroundPosition = "center";
            markerEl.style.pointerEvents = "none";
            markerEl.style.zIndex = "10";
            markerEl.style.willChange = "transform";
            markerEl.style.boxShadow = "0px 1px 8px rgba(0, 0, 0, 0.15)";

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

    let cachedPadding = { top: 0, bottom: 0, left: 0, right: 0 };
    const updateCachedPadding = () => {
        if (!map.value) return;
        const container = map.value.getContainer();
        const height = container.clientHeight;
        const width = container.clientWidth;
        const isLandscape = width > height;
        const topRatio = isLandscape ? 0.3 : 0.4;

        cachedPadding = {
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
        return cachedPadding;
    };

    const updateMarkerTransform = () => {
        if (!markerEl || !currentTruckCoords || !map.value) return;

        const isTargetAtOrigin =
            targetCoords && targetCoords[0] === 0 && targetCoords[1] === 0;

        if (isTargetAtOrigin) {
            if (markerEl.style.display !== "none")
                markerEl.style.display = "none";
            return;
        }

        if (markerEl.style.display !== "block") {
            markerEl.style.display = "block";
        }

        const pos = map.value.project(currentTruckCoords);
        const pitch = map.value.getPitch();
        const bearing = map.value.getBearing();

        const screenRot = currentTruckHeading - bearing;
        const effectivePitch = pitch * 0.83;

        markerEl.style.transform = `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotateX(${effectivePitch}deg) rotateZ(${screenRot}deg)`;
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

            const isCurrentlyEasing = now < easingUntil;

            if (
                isCameraLocked.value &&
                !isCurrentlyEasing &&
                !isTargetAtOrigin
            ) {
                map.value.jumpTo({
                    center: [currentTruckCoords[0], currentTruckCoords[1]],
                    bearing: isHeadingActive.value ? currentTruckHeading : 0,
                    padding: getPadding(),
                });
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
        updateCachedPadding();

        map.value.on("resize", updateCachedPadding);

        map.value.on("render", updateMarkerTransform);

        const onUserInteractionStart = (e: any) => {
            if (!e.originalEvent) return;

            isCameraLocked.value = false;
            easingUntil = 0;

            if (autoLockTimer) {
                clearTimeout(autoLockTimer);
                autoLockTimer = null;
            }
        };

        const onUserInteractionEnd = () => {
            if (autoLockTimer) clearTimeout(autoLockTimer);

            if (isHeadingActive.value || isNorthActive.value) {
                autoLockTimer = setTimeout(() => {
                    autoLockTimer = null;
                    resumeCameraLock();
                }, 2300);
            }
        };

        map.value.on("mousedown", onUserInteractionStart);
        map.value.on("touchstart", onUserInteractionStart);
        map.value.on("dragstart", onUserInteractionStart);
        map.value.on("wheel", onUserInteractionStart);

        map.value.on("mouseup", onUserInteractionEnd);
        map.value.on("touchend", onUserInteractionEnd);
        map.value.on("dragend", onUserInteractionEnd);
    };

    const easeCameraTo = (options: any) => {
        if (!map.value) return;

        const duration = options.duration ?? 800;

        easingUntil = performance.now() + duration;

        map.value.easeTo({
            ...options,
            duration,
            essential: true,
            easing: (t: number) =>
                t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        });
    };

    const toggleNorthFollow = () => {
        if (!map.value) return;
        const centerPos = currentTruckCoords || targetCoords;

        if (autoLockTimer) clearTimeout(autoLockTimer);

        if (!isNorthActive.value) {
            isNorthActive.value = true;
            isHeadingActive.value = false;
            isCameraLocked.value = true;

            easeCameraTo({
                center: centerPos,
                bearing: 0,
                pitch: map.value.getPitch(),
                zoom: map.value.getZoom(),
                padding: getPadding(),
            });
        } else {
            isNorthActive.value = false;
            isCameraLocked.value = false;
        }
    };

    const toggleHeadingFollow = () => {
        if (!map.value) return;
        const centerPos = currentTruckCoords || targetCoords;

        if (autoLockTimer) clearTimeout(autoLockTimer);

        if (!isHeadingActive.value) {
            isHeadingActive.value = true;
            isNorthActive.value = false;
            isCameraLocked.value = true;

            easeCameraTo({
                center: centerPos,
                bearing: currentTruckHeading,
                pitch: map.value.getPitch(),
                zoom: map.value.getZoom(),
                duration: 700,
                padding: getPadding(),
            });
        } else {
            isHeadingActive.value = false;
            isCameraLocked.value = false;
        }
    };

    const resumeCameraLock = (isFollowButtonEnabled?: boolean) => {
        if (!map.value || !currentTruckCoords) return;
        const centerPos = currentTruckCoords || targetCoords;
        if (!centerPos) return;

        if (!isHeadingActive.value && !isNorthActive.value) {
            isHeadingActive.value = true;
        }

        const currentPitch = map.value.getPitch();
        const currentZoom = map.value.getZoom();
        isCameraLocked.value = true;

        if (isHeadingActive.value) {
            easeCameraTo({
                center: centerPos,
                bearing: currentTruckHeading,
                pitch: currentPitch,
                zoom: currentZoom,
                duration: 700,
                padding: getPadding(),
            });
        } else if (isNorthActive.value) {
            easeCameraTo({
                center: centerPos,
                bearing: 0,
                pitch: currentPitch,
                zoom: currentZoom,
                duration: 700,
                padding: getPadding(),
            });
        }
    };

    const focusTruckInitial = (coords: [number, number], heading: number) => {
        if (!map.value) return;

        isHeadingActive.value = true;
        isNorthActive.value = false;
        isCameraLocked.value = true;

        easeCameraTo({
            center: coords,
            bearing: heading,
            zoom: 9,
            pitch: 30,
            duration: 1200,
            padding: getPadding(),
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
        isHeadingActive.value = true;
        isNorthActive.value = false;

        targetCoords = coords;
        targetHeading = heading;

        easeCameraTo({
            center: coords,
            bearing: heading,
            zoom: 11,
            pitch: 50,
            padding: getPadding(),
        });
    };

    const stopNavigationMode = () => {
        if (!map.value || !currentTruckCoords) return;
        const centerPos = currentTruckCoords || targetCoords;
        if (!isNavigating.value) return;

        isNavigating.value = false;
        isNorthActive.value = true;
        isHeadingActive.value = false;
        isCameraLocked.value = true;

        easeCameraTo({
            center: centerPos,
            pitch: 0,
            bearing: 0,
            padding: { top: 0, bottom: 0, left: 0, right: 0 },
        });
    };

    onUnmounted(() => {
        stopRenderLoop();
        if (easeTimeout) clearTimeout(easeTimeout);
        if (autoLockTimer) clearTimeout(autoLockTimer);

        if (map.value) {
            map.value.off("resize", updateCachedPadding);
            map.value.off("render", updateMarkerTransform);
        }

        if (markerEl) {
            markerEl.remove();
            markerEl = null;
        }
    });

    return {
        isCameraLocked,
        isNavigating,
        isHeadingActive,
        isNorthActive,
        toggleHeadingFollow,
        toggleNorthFollow,
        initMarker,
        updateMarkerSize,
        updateMarkerImage,
        initCameraListeners,
        followTruck,
        stopNavigationMode,
        resumeCameraLock,
        lockCamera,
        startNavigationMode,
        resetTruck,
        focusTruckInitial,
    };
};
