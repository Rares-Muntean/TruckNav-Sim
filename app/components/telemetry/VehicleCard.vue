<script lang="ts" setup>
import {
    formatNumber,
    formatRemainingTime,
    getPercentage,
    getStatusLevel,
} from "~/assets/utils/telemetry/helpers";

const props = defineProps<{
    variant?: "drive-view";
}>();

const {
    fuel,
    fuelCapacity,
    odometer,
    truckBrand,
    truckName,
    fuelRange,
    avgConsumption,
    averageSpeed,
} = useEtsTelemetry();

const { kmToUserUnits, distanceUnit, formatConsumption, consumptionUnit } =
    useUnitConversion();
const { mapScaleConfig } = useCityData();
const { settings } = useSettings();
const { t } = useTranslations();

const currentFuelStatShowing = ref<"range" | "time">("range");
let timer: ReturnType<typeof setInterval> | null = null;

const odometerConverted = computed(() => kmToUserUnits(odometer.value));
const fuelRangeConverted = computed(() => kmToUserUnits(fuelRange.value));

const avgConsumptionConverted = computed(() =>
    formatConsumption(avgConsumption.value),
);

const fuelPercentage = computed(() =>
    getPercentage(fuel.value, fuelCapacity.value),
);

const fuelStatusColor = computed(() =>
    getStatusLevel("fuel", fuelPercentage.value),
);

const timeToEmptyFuel = computed(() => {
    if (!fuelRange.value || fuelRange.value <= 0) {
        return null;
    }

    const speed = Math.max(60, averageSpeed.value);
    const gameMinutes = Math.round((fuelRange.value / speed) * 60);

    if (settings.value.routeTimeMode == "real") {
        const highwayScale = mapScaleConfig.value.ruralScale;

        const realMinutes = Math.max(0, Math.round(gameMinutes / highwayScale));
        return formatRemainingTime(realMinutes);
    }

    return formatRemainingTime(gameMinutes);
});

function toggleCurrentFuelStat() {
    if (currentFuelStatShowing.value === "range") {
        currentFuelStatShowing.value = "time";
    } else {
        currentFuelStatShowing.value = "range";
    }
}

onMounted(() => {
    nextTick(() => {
        timer = setInterval(() => {
            toggleCurrentFuelStat();
        }, 8000);
    });
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<template>
    <div class="card" :class="variant">
        <div class="card-title-wrapper">
            <p class="card-title">{{ t("trip.vehicle") }}</p>
            <Icon name="lucide:truck" class="card-icon" />
        </div>

        <div class="truck-data">
            <div class="truck-name-wrapper">
                <span class="manufacturer">{{ truckBrand }} </span>
                <div class="model-odo">
                    <span class="model">
                        {{ truckName }}
                    </span>

                    <span class="total-odo"
                        >({{ formatNumber(odometerConverted) }}
                        {{ distanceUnit }})</span
                    >
                </div>
            </div>
        </div>

        <div class="data-content data-pill">
            <div class="data-title-wrapper">
                <div class="data-title">
                    <Icon
                        name="lucide:fuel"
                        class="icon"
                        :style="{ color: fuelStatusColor }"
                    />

                    <div class="fuel-percentage-wrapper">
                        <span>{{ t("trip.fuel") }}</span>

                        <div class="fuel-percentage">
                            <span>({{ fuelPercentage }}</span>
                            <span class="unit">%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="remains-avg-wrapper">
                <div
                    v-if="currentFuelStatShowing === 'range'"
                    class="fuel-unit-group"
                >
                    <span>{{ formatNumber(fuelRangeConverted) }}</span>
                    <span class="unit">{{ distanceUnit }}</span>
                </div>

                <div
                    v-else-if="
                        timeToEmptyFuel && currentFuelStatShowing === 'time'
                    "
                    class="remaining-fuel-time"
                >
                    <div class="remaining-time-wrapper">
                        <span>{{ timeToEmptyFuel.hours }}</span>
                        <span class="unit white">h</span>
                    </div>

                    <div class="remaining-time-wrapper">
                        <span>{{ timeToEmptyFuel.mins }}</span>
                        <span class="unit white">m</span>
                    </div>
                </div>

                <span class="dot"></span>

                <div class="avg-consumpt fuel-unit-group">
                    <span>{{ avgConsumptionConverted }}</span>
                    <span class="unit">{{ consumptionUnit }}</span>
                </div>
            </div>
        </div>

        <ProgressBar
            :progress="fuelPercentage"
            :bar-height="4"
            :color="fuelStatusColor"
            class="full-width-bar"
        />
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/telemetry/telemetryTripCards.scss"
></style>
