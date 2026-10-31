<script lang="ts" setup>
import { getPercentage } from "~/assets/utils/telemetry/helpers";

const { fuel, fuelCapacity, fuelRange, averageSpeed } = useEtsTelemetry();
const { literToUserUnits, fuelUnit } = useUnitConversion();
const { t } = useTranslations();

const hasFuelData = computed(() => fuelCapacity.value > 0);

const fuelAmount = computed(() => Math.round(literToUserUnits(fuel.value)));

const fuelPercentage = computed(() =>
    getPercentage(fuel.value, fuelCapacity.value),
);

const isLowFuel = computed(
    () => hasFuelData.value && fuelPercentage.value <= 15,
);

const timeToEmpty = computed(() => {
    if (!fuelRange.value || fuelRange.value <= 0 || averageSpeed.value <= 0) {
        return "—";
    }

    const totalMinutes = Math.round(
        (fuelRange.value / averageSpeed.value) * 60,
    );
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});
</script>

<template>
    <div
        v-if="hasFuelData"
        class="fuel-hud"
        :class="{ 'is-low': isLowFuel }"
        :aria-label="t('uiComponents.fuelTitle')"
        :title="`${t('uiComponents.fuelTitle')} · ${timeToEmpty}`"
    >
        <div class="fuel-amount">
            <Icon name="lucide:fuel" class="fuel-icon" />
            <span class="value">{{ fuelAmount }}</span>
            <span class="unit">{{ fuelUnit }}</span>
        </div>

        <div class="fuel-time">
            <Icon name="lucide:clock" class="clock-icon" />
            <span>{{ timeToEmpty }}</span>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/fuelGauge.scss"
></style>
