<script lang="ts" setup>
import { animate, distance, type PanInfo } from "motion";
import { motion } from "motion-v";
import {
    formatCompactNumber,
    formatNumber,
    formatRemainingTime,
    getPercentage,
    getRestPercentage,
} from "~/assets/utils/telemetry/helpers";
import { EASE } from "~/types/easings";

const {
    truckSpeed,
    fuel,
    odometer,
    truckBrand,
    truckName,
    fuelCapacity,
    fuelRange,
    avgConsumption,
    restStopMinutes,
    speedLimit,

    hasActiveJob,

    engine,
    transmission,
    cabin,
    chassis,
    wheels,

    income,
    remainingTime,
    cargo,

    destinationCityName,
    destinationCompanyName,
    sourceCityName,
    sourceCompanyName,
} = useEtsTelemetry();

const props = defineProps<{
    routeDistanceConverted: number;
}>();

const { settings } = useSettings();

const tabs = ["currentJob", "vehicleWear"] as const;
const activeTab = ref<"currentJob" | "vehicleWear">("currentJob");

function handleDragEnd(_event: PointerEvent, info: PanInfo) {
    const threshold = 50;
    const velocityThreshold = 400;

    const currentIndex = tabs.indexOf(activeTab.value);

    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        if (currentIndex < tabs.length - 1) {
            activeTab.value = tabs[currentIndex + 1]!;
        }
    }

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        if (currentIndex > 0) {
            activeTab.value = tabs[currentIndex - 1]!;
        }
    }
}

function toggleCardview() {
    if (activeTab.value === "currentJob") {
        activeTab.value = "vehicleWear";
    } else {
        activeTab.value = "currentJob";
    }
}

const {
    kmToUserUnits,
    speedUnit,
    distanceUnit,
    formatConsumption,
    consumptionUnit,
    kgToUserUnits,
    weightUnit,
} = useUnitConversion();

const truckSpeedConverted = computed(() => kmToUserUnits(truckSpeed.value));
const odometerConverted = computed(() => kmToUserUnits(odometer.value));
const fuelRangeConverted = computed(() => kmToUserUnits(fuelRange.value));
const cargoWeightConverted = computed(() => kgToUserUnits(cargo.value.mass));

const avgConsumptionConverted = computed(() =>
    formatConsumption(avgConsumption.value),
);

const fuelPercentage = computed(() =>
    getPercentage(fuel.value, fuelCapacity.value),
);

const restPercentage = computed(() => {
    return getRestPercentage(
        restStopMinutes.value,
        settings.value.selectedGame,
    );
});

const speedPercentage = computed(() => {
    return getPercentage(truckSpeedConverted.value, speedLimit.value);
});

const remainingTimeObj = computed(() =>
    formatRemainingTime(remainingTime.value),
);
</script>

<template>
    <section class="section-trip">
        <div class="background-dim"></div>

        <div class="section trip-content">
            <div class="top-half">
                <div class="card">
                    <div class="card-title-wrapper">
                        <p class="card-title">Vehicle</p>
                        <Icon name="lucide:truck" class="card-icon" />
                    </div>

                    <div class="truck-data">
                        <div class="truck-name-wrapper">
                            <span class="manufacturer">{{ truckBrand }}</span>
                            <span class="model">{{ truckName }}</span>
                        </div>

                        <span class="total-odo"
                            >({{ formatNumber(odometerConverted) }}
                            {{ distanceUnit }})</span
                        >
                    </div>

                    <div class="fuel-pill">
                        <div class="fuel-title-wrapper">
                            <div class="fuel-title">
                                <Icon name="lucide:fuel" class="icon" />
                            </div>

                            <div class="fuel-percentage-wrapper">
                                <span>Fuel</span>

                                <div class="fuel-percentage">
                                    <span>({{ fuelPercentage }}</span>
                                    <span class="unit">%)</span>
                                </div>
                            </div>
                        </div>

                        <div class="remains-avg-wrapper">
                            <div class="fuel-unit-group">
                                <span>{{
                                    formatNumber(fuelRangeConverted)
                                }}</span>
                                <span class="unit">{{ distanceUnit }}</span>
                            </div>

                            <span class="dot"></span>

                            <div class="fuel-unit-group">
                                <span>{{ avgConsumptionConverted }}</span>
                                <span class="unit">{{ consumptionUnit }}</span>
                            </div>
                        </div>
                    </div>

                    <ProgressBar
                        :progress="fuelPercentage"
                        :bar-height="4"
                        class="full-width-bar"
                    />
                </div>
            </div>

            <div class="bottom-half">
                <div class="speed-sleep">
                    <div class="card">
                        <div class="card-title-wrapper">
                            <p class="card-title">Speed</p>
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
                            class="full-width-bar"
                        />

                        <div class="value-status">
                            <div class="dot"></div>
                            <span>Safe Speed</span>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-title-wrapper">
                            <p class="card-title">Rest</p>
                            <Icon name="lucide:bed" class="card-icon" />
                        </div>

                        <div class="data-value-wrapper">
                            <p class="card-value-number">
                                {{ restPercentage }}
                            </p>

                            <p class="card-value-unit">%</p>
                        </div>

                        <ProgressBar
                            :progress="restPercentage"
                            :bar-height="4"
                            class="full-width-bar"
                        />

                        <div class="value-status">
                            <div class="dot"></div>
                            <span>Rested</span>
                        </div>
                    </div>
                </div>

                <motion.div
                    @click="toggleCardview"
                    drag="x"
                    drag-snap-to-origin
                    :drag-constraints="{ left: 0, right: 0 }"
                    :drag-elastic="0"
                    @drag-end="handleDragEnd"
                    class="trip-info"
                >
                    <div
                        v-if="activeTab === 'currentJob' && hasActiveJob"
                        class="card delivery-info"
                    >
                        <div class="card-title-wrapper">
                            <p class="card-title">Current Job</p>
                            <Icon name="lucide:box" class="card-icon" />
                        </div>

                        <div class="card-pills"></div>

                        <div class="card-content">
                            <div class="route-display">
                                <div class="location-group origin">
                                    <span class="city">{{
                                        sourceCityName
                                    }}</span>
                                    <span class="company">{{
                                        sourceCompanyName
                                    }}</span>
                                </div>

                                <div class="route-track">
                                    <div class="distance-badge">
                                        <span class="dist">{{
                                            formatNumber(routeDistanceConverted)
                                        }}</span>
                                        <span class="unit">{{
                                            distanceUnit
                                        }}</span>
                                    </div>
                                    <div class="line-with-arrow">
                                        <div class="line"></div>
                                    </div>
                                </div>

                                <div class="location-group destination">
                                    <span class="city">{{
                                        destinationCityName
                                    }}</span>
                                    <span class="company">{{
                                        destinationCompanyName
                                    }}</span>
                                </div>
                            </div>

                            <div class="cargo-display">
                                <div class="cargo-group left">
                                    <span class="cargo-title">Cargo</span>
                                    <span class="cargo-value">{{
                                        cargo.name
                                    }}</span>
                                </div>

                                <div class="cargo-group right">
                                    <span class="cargo-title">Weight</span>
                                    <div class="weight-wrapper">
                                        <span class="cargo-value">{{
                                            formatNumber(cargoWeightConverted)
                                        }}</span>

                                        <span class="unit">{{
                                            weightUnit
                                        }}</span>
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
                                        <span class="cargo-value">{{
                                            cargo.cargoDamage
                                        }}</span>
                                        <span class="unit">%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="job-payout-banner">
                                <div class="payout-label">
                                    <Icon
                                        name="lucide:banknote"
                                        class="payout-icon"
                                    />
                                    <span>Payout</span>
                                </div>

                                <span class="payout-amount"
                                    >€{{ formatCompactNumber(income) }}</span
                                >
                            </div>
                        </div>
                    </div>

                    <div
                        class="card delivery-info"
                        v-else-if="activeTab === 'currentJob'"
                    >
                        <div class="card-title-wrapper">
                            <p class="card-title">Freeroam</p>
                            <Icon name="lucide:route" class="card-icon" />
                        </div>

                        <div class="middle-wrapper">
                            <div class="middle-icon-wrapper">
                                <Icon
                                    name="lucide:compass"
                                    size="70"
                                    class="middle-icon"
                                />
                            </div>

                            <div class="bottom-text">
                                <div class="header-wrapper">
                                    <span class="header">Open Road Ahead</span>
                                </div>

                                <span class="sub-header">
                                    No active delivery. Pick up a contract from
                                    the freight market or enjoy the drive.
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="activeTab === 'vehicleWear'"
                        class="card delivery-info"
                    >
                        <div class="card-title-wrapper">
                            <p class="card-title">Vehicle Damage</p>
                            <Icon name="lucide:hammer" class="card-icon" />
                        </div>

                        <div class="card-pills"></div>

                        <div class="card-content damage-wear">
                            <div class="damage-data-wrapper">
                                <Icon
                                    name="tabler:engine"
                                    class="damage-icon"
                                />

                                <div class="progress-percentage-wrapper">
                                    <ProgressBar
                                        :progress="engine"
                                        :bar-height="4"
                                        class="full-width-bar"
                                    />

                                    <div class="percentage-wrapper">
                                        <span>{{ engine }}</span>
                                        <span class="percentage">%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="damage-data-wrapper">
                                <Icon
                                    name="tabler:manual-gearbox"
                                    class="damage-icon"
                                />

                                <div class="progress-percentage-wrapper">
                                    <ProgressBar
                                        :progress="transmission"
                                        :bar-height="4"
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
                                        class="full-width-bar"
                                    />

                                    <div class="percentage-wrapper">
                                        <span>{{ cabin }}</span>
                                        <span class="percentage">%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="damage-data-wrapper">
                                <Icon
                                    name="tabler:car-4wd"
                                    class="damage-icon"
                                />

                                <div class="progress-percentage-wrapper">
                                    <ProgressBar
                                        :progress="chassis"
                                        :bar-height="4"
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

                    <div class="carousel-dots">
                        <div
                            class="dot"
                            :class="{ active: activeTab === 'currentJob' }"
                        ></div>
                        <div
                            class="dot"
                            :class="{ active: activeTab === 'vehicleWear' }"
                        ></div>
                    </div>
                </motion.div>
            </div>
        </div>
    </section>
</template>

<style lang="scss" scoped src="~/assets/scss/scoped/common/trip.scss"></style>
