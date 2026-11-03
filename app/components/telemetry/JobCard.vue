<script lang="ts" setup>
import {
    formatCompactNumber,
    formatNumber,
    formatRemainingTime,
} from "~/assets/utils/telemetry/helpers";

const props = defineProps<{
    routeDistanceConverted: number;
}>();

const { settings } = useSettings();
const { mapScaleConfig } = useCityData();

const {
    income,
    remainingTime,
    cargo,

    destinationCityName,
    destinationCompanyName,
    sourceCityName,
    sourceCompanyName,
} = useEtsTelemetry();

const { distanceUnit, kgToUserUnits, weightUnit } = useUnitConversion();

const cargoWeightConverted = computed(() => kgToUserUnits(cargo.value.mass));

const displayRemainingMinutes = computed(() => {
    if (settings.value.routeTimeMode === "real") {
        const highwayScale =
            mapScaleConfig.value?.ruralScale ||
            (settings.value.selectedGame === "ats" ? 20 : 19);

        return Math.max(0, Math.round(remainingTime.value / highwayScale));
    }

    return remainingTime.value;
});

const remainingTimeObj = computed(() =>
    formatRemainingTime(displayRemainingMinutes.value),
);
</script>

<template>
    <div class="card delivery-info">
        <div class="card-title-wrapper">
            <p class="card-title">Current Job</p>
            <Icon name="lucide:box" class="card-icon" />
        </div>

        <div class="card-pills"></div>

        <div class="card-content">
            <div class="route-display">
                <div class="location-group origin">
                    <span class="city">{{ sourceCityName }}</span>
                    <span class="company">{{ sourceCompanyName }}</span>
                </div>

                <div class="route-track">
                    <div class="distance-badge">
                        <span class="dist">{{
                            formatNumber(routeDistanceConverted)
                        }}</span>
                        <span class="unit">{{ distanceUnit }}</span>
                    </div>
                    <div class="line-with-arrow">
                        <div class="line"></div>
                    </div>
                </div>

                <div class="location-group destination">
                    <span class="city">{{ destinationCityName }}</span>
                    <span class="company">{{ destinationCompanyName }}</span>
                </div>
            </div>

            <div class="cargo-display">
                <div class="cargo-group left">
                    <span class="cargo-title">Cargo</span>
                    <span class="cargo-value">{{ cargo.name }}</span>
                </div>

                <div class="cargo-group right">
                    <span class="cargo-title">Weight</span>
                    <div class="weight-wrapper">
                        <span class="cargo-value">{{
                            formatNumber(cargoWeightConverted)
                        }}</span>

                        <span class="unit">{{ weightUnit }}</span>
                    </div>
                </div>
            </div>

            <div class="cargo-display">
                <div class="cargo-group left">
                    <span class="cargo-title">Remains</span>
                    <div class="remains-wrapper">
                        <div class="time">
                            <span class="cargo-value">{{
                                remainingTimeObj.hours
                            }}</span>
                            <span class="unit white">h</span>
                        </div>

                        <div class="time">
                            <span class="cargo-value">{{
                                remainingTimeObj.mins
                            }}</span>
                            <span class="unit white">m</span>
                        </div>
                    </div>
                </div>

                <div class="cargo-group right">
                    <span class="cargo-title">Wear</span>
                    <div class="weight-wrapper">
                        <span class="cargo-value">{{ cargo.cargoDamage }}</span>
                        <span class="unit">%</span>
                    </div>
                </div>
            </div>

            <div class="job-payout-banner">
                <div class="payout-label">
                    <Icon name="lucide:banknote" class="payout-icon" />
                    <span>Payout</span>
                </div>

                <span class="payout-amount"
                    >€{{ formatCompactNumber(income) }}</span
                >
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/telemetry/telemetryTripCards.scss"
></style>
