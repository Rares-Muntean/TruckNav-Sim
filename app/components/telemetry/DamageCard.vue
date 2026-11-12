<script lang="ts" setup>
import { getStatusLevel } from "~/assets/utils/telemetry/helpers";

const { t } = useTranslations();

const { engine, transmission, cabin, chassis, wheels } = useEtsTelemetry();
</script>

<template>
    <div class="card delivery-info">
        <div class="card-title-wrapper">
            <p class="card-title">{{ t("trip.vehicleDamage") }}</p>
            <Icon name="lucide:hammer" class="card-icon" />
        </div>

        <div class="card-pills"></div>

        <div class="card-content damage-wear">
            <div class="damage-data-wrapper">
                <Icon name="tabler:engine" class="damage-icon" />

                <div class="progress-percentage-wrapper">
                    <ProgressBar
                        :progress="engine"
                        :bar-height="4"
                        :color="getStatusLevel('damage', engine)"
                        class="full-width-bar"
                    />

                    <div class="percentage-wrapper">
                        <span>{{ engine }}</span>
                        <span class="percentage">%</span>
                    </div>
                </div>
            </div>

            <div class="damage-data-wrapper">
                <Icon name="tabler:manual-gearbox" class="damage-icon" />

                <div class="progress-percentage-wrapper">
                    <ProgressBar
                        :progress="transmission"
                        :bar-height="4"
                        :color="getStatusLevel('damage', transmission)"
                        class="full-width-bar"
                    />
                    <div class="percentage-wrapper">
                        <span>{{ transmission }}</span>
                        <span class="percentage">%</span>
                    </div>
                </div>
            </div>

            <div class="damage-data-wrapper">
                <Icon name="tabler:truck" class="damage-icon" />

                <div class="progress-percentage-wrapper">
                    <ProgressBar
                        :progress="cabin"
                        :bar-height="4"
                        :color="getStatusLevel('damage', cabin)"
                        class="full-width-bar"
                    />

                    <div class="percentage-wrapper">
                        <span>{{ cabin }}</span>
                        <span class="percentage">%</span>
                    </div>
                </div>
            </div>

            <div class="damage-data-wrapper">
                <Icon name="tabler:car-4wd" class="damage-icon" />

                <div class="progress-percentage-wrapper">
                    <ProgressBar
                        :progress="chassis"
                        :bar-height="4"
                        :color="getStatusLevel('damage', chassis)"
                        class="full-width-bar"
                    />

                    <div class="percentage-wrapper">
                        <span>{{ chassis }}</span>
                        <span class="percentage">%</span>
                    </div>
                </div>
            </div>

            <div class="damage-data-wrapper">
                <Icon name="tabler:wheel" class="damage-icon" />

                <div class="progress-percentage-wrapper">
                    <ProgressBar
                        :progress="wheels"
                        :bar-height="4"
                        :color="getStatusLevel('damage', wheels)"
                        class="full-width-bar"
                    />

                    <div class="percentage-wrapper">
                        <span>{{ wheels }}</span>
                        <span class="percentage">%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/telemetry/telemetryTripCards.scss"
></style>
