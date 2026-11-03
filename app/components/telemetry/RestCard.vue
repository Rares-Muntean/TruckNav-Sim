<script lang="ts" setup>
import {
    getRestPercentage,
    getStatusLevel,
} from "~/assets/utils/telemetry/helpers";

const { restStopMinutes } = useEtsTelemetry();

const { settings } = useSettings();

const props = defineProps<{
    variant?: "drive-view";
}>();

const restPercentage = computed(() => {
    return getRestPercentage(
        restStopMinutes.value,
        settings.value.selectedGame,
    );
});

const restStatusColor = computed(() =>
    getStatusLevel("rest", restPercentage.value),
);
</script>

<template>
    <div class="card" :class="variant">
        <div class="card-title-wrapper">
            <p class="card-title">Rest</p>
            <Icon name="lucide:bed" class="card-icon" />
        </div>

        <div :class="{ 'data-pill': variant === 'drive-view' }">
            <div
                class="data-value-wrapper"
                :class="{ 'data-title': variant === 'drive-view' }"
            >
                <Icon
                    v-if="variant === 'drive-view'"
                    name="lucide:bed"
                    class="icon"
                />

                <div class="unit-group">
                    <p class="card-value-number">
                        {{ restPercentage }}
                    </p>

                    <p class="card-value-unit">%</p>
                </div>
            </div>
        </div>

        <ProgressBar
            :progress="restPercentage"
            :bar-height="4"
            :color="restStatusColor"
            class="full-width-bar"
        />

        <div class="value-status">
            <div
                class="dot"
                :style="{ backgroundColor: restStatusColor }"
            ></div>
            <span>Rested</span>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/telemetry/telemetryTripCards.scss"
></style>
