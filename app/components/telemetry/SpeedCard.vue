<script lang="ts" setup>
import {
    getPercentage,
    getStatusLevel,
} from "~/assets/utils/telemetry/helpers";

const { truckSpeed, speedLimit } = useEtsTelemetry();

const speedPercentage = computed(() => {
    return getPercentage(truckSpeedConverted.value, speedLimit.value);
});

const { kmToUserUnits, speedUnit } = useUnitConversion();
const { t } = useTranslations();

const truckSpeedConverted = computed(() => kmToUserUnits(truckSpeed.value));

const speedStatusColor = computed(() =>
    getStatusLevel(
        "speed",
        speedPercentage.value,
        speedLimit.value,
        truckSpeedConverted.value,
    ),
);
</script>

<template>
    <div class="card">
        <div class="card-title-wrapper">
            <p class="card-title">{{ t("trip.speed") }}</p>
            <Icon name="lucide:gauge" class="card-icon" />
        </div>

        <div class="data-value-wrapper">
            <p class="card-value-number">
                {{ truckSpeedConverted }}
            </p>

            <p class="card-value-unit">{{ speedUnit }}</p>
        </div>

        <ProgressBar
            :progress="speedPercentage"
            :bar-height="4"
            :color="speedStatusColor"
            class="full-width-bar"
        />

        <div class="value-status">
            <div
                class="dot"
                :style="{ backgroundColor: speedStatusColor }"
            ></div>
            <span>{{ t("trip.safeSpeed") }}</span>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/telemetry/telemetryTripCards.scss"
></style>
