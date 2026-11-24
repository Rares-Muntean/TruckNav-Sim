import type { DirectionStep } from "~/assets/utils/routing/directions";
import { clearVoiceQueue, playVoice } from "~/assets/utils/routing/voicePlayer";

interface TierVoice {
    tier: number;
    clipKey: string;
}

const { scale } = useEtsTelemetry();
const { mapScaleConfig } = useCityData();

function getDistanceTier(
    realMeters: number,
    imperial: boolean,
): TierVoice | null {
    if (!imperial) {
        if (realMeters <= 80) return { tier: 0, clipKey: "now" };
        if (realMeters <= 320) return { tier: 1, clipKey: "in_500m" };
    } else {
        if (realMeters <= 80) return { tier: 0, clipKey: "now" };
        if (realMeters <= 320) return { tier: 1, clipKey: "in_half_mile" };
    }

    return null;
}

export function useVoiceNavigation(options: {
    upcomingTurns: Ref<DirectionStep[]>;
    distanceToNextTurn: Ref<number>;
    isActive: Ref<boolean>;
}) {
    const { settings, activeSettings } = useSettings();
    const spokenTierByTurn = new Map<string, number>();
    let hasAnnouncedStart = false;

    watch(
        [
            () => options.upcomingTurns.value[1],
            options.distanceToNextTurn,
            options.isActive,
        ],
        ([currentTurn, distKm, active]) => {
            if (!active) {
                spokenTierByTurn.clear();
                clearVoiceQueue();
                hasAnnouncedStart = false;
                return;
            }

            if (
                !activeSettings.value.hasVoiceNavigation ||
                !activeSettings.value.hasTurnNavigation
            )
                return;

            const volume = 1;
            const base = "/voices/woman/en"; // settings option

            if (
                !hasAnnouncedStart &&
                options.upcomingTurns.value[0]?.voiceKey === "start_route"
            ) {
                hasAnnouncedStart = true;
                playVoice([`${base}/start_route.ogg`], volume);
            }

            if (!currentTurn?.voiceKey) return;

            const currentScale =
                scale.value > 0 ? scale.value : mapScaleConfig.value.ruralScale;
            const realMeters = (distKm * 1000) / currentScale;

            console.log(realMeters);

            if (currentTurn.type === "destination") {
                if (realMeters > 65) return;
            }

            const isImperial = activeSettings.value.units === "imperial";
            const match =
                currentTurn.type === "destination"
                    ? realMeters <= 65
                        ? { tier: 0, clipKey: "now" }
                        : null
                    : getDistanceTier(realMeters, isImperial);

            if (!match) return;

            if (
                (currentTurn.type === "destination" ||
                    currentTurn.type === "roundabout") &&
                match.tier > 0
            ) {
                return;
            }

            const turnKey = `${currentTurn.id}_${Math.round(
                (currentTurn.cumulativeKm ?? 0) * 100,
            )}`;

            const lastTier = spokenTierByTurn.get(turnKey) ?? 99;
            if (match.tier >= lastTier) return;

            if (lastTier === 99 && match.tier === 1 && realMeters < 180) {
                spokenTierByTurn.set(turnKey, 1);
                return;
            }

            spokenTierByTurn.set(turnKey, match.tier);

            if (spokenTierByTurn.size > 20) {
                const oldest = spokenTierByTurn.keys().next().value;
                if (oldest) spokenTierByTurn.delete(oldest);
            }

            if (match.clipKey === "now") {
                playVoice([`${base}/${currentTurn.voiceKey}.ogg`], volume);
            } else {
                playVoice(
                    [
                        `${base}/${match.clipKey}.ogg`,
                        `${base}/${currentTurn.voiceKey}.ogg`,
                    ],
                    volume,
                );
            }
        },
        { immediate: true },
    );

    const resetVoiceState = () => {
        spokenTierByTurn.clear();
        clearVoiceQueue();
        hasAnnouncedStart = false;
    };

    return {
        resetVoiceState,
    };
}
