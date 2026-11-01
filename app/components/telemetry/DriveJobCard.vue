<script lang="ts" setup>
import {
    formatRemainingTime,
    getPercentage,
    getRestPercentage,
    getStatusLevel,
} from "~/assets/utils/telemetry/helpers";

const { destinationCityName, destinationCompanyName, remainingTime } =
    useEtsTelemetry();

const { activeSettings } = useSettings();

const props = defineProps<{
    variant?: "drive-view";
}>();

const remainingTimeObj = computed(() =>
    formatRemainingTime(remainingTime.value),
);

const initialDeliveryMinutes = computed(() => {
    const saved = activeSettings.value.lastJob;
    return saved.initialMinutes;
});

const remainingTimePercentage = computed(() =>
    getPercentage(remainingTime.value, initialDeliveryMinutes.value),
);

const remainingTimeStatusColor = computed(() =>
    getStatusLevel("remainingTime", remainingTimePercentage.value),
);
</script>

<template>
    <div class="card" :class="variant">
        <div class="data-pill">
            <div class="data-value-wrapper data-title ellipsis">
                <Icon name="lucide:map-pin-check" class="icon" />

                <div class="text-group">
                    <p class="card-value-number string">
                        {{ destinationCityName }}
                    </p>

                    <p class="card-value-unit company">
                        {{ destinationCompanyName }}
                    </p>
                </div>
            </div>

            <span class="progress-percentage">
                <div class="remains-wrapper small">
                    <div class="time">
                        <span>{{ remainingTimeObj.hours }}</span>
                        <span class="unit">h</span>
                    </div>

                    <div class="time">
                        <span>{{ remainingTimeObj.mins }}</span>
                        <span class="unit">m</span>
                    </div>
                </div>
            </span>
        </div>

        <div class="bottom-progress">
            <ProgressBar
                :progress="remainingTimePercentage"
                :bar-height="4"
                :color="remainingTimeStatusColor"
                class="full-width-bar"
            />
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/telemetry/telemetryTripCards.scss"
></style>
