<script lang="ts" setup>
import {
    formatNumber,
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
} = useEtsTelemetry();

const { kmToUserUnits, distanceUnit, formatConsumption, consumptionUnit } =
    useUnitConversion();

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
</script>

<template>
    <div class="card" :class="variant">
        <div class="card-title-wrapper">
            <p class="card-title">Vehicle</p>
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

        <div class="data-pill">
            <div class="data-title-wrapper">
                <div class="data-title">
                    <Icon
                        name="lucide:fuel"
                        class="icon"
                        :style="{ color: fuelStatusColor }"
                    />

                    <div class="fuel-percentage-wrapper">
                        <span>Fuel</span>

                        <div class="fuel-percentage">
                            <span>({{ fuelPercentage }}</span>
                            <span class="unit">%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="remains-avg-wrapper">
                <div class="fuel-unit-group">
                    <span>{{ formatNumber(fuelRangeConverted) }}</span>
                    <span class="unit">{{ distanceUnit }}</span>
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
