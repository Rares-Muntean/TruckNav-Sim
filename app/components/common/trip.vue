<script lang="ts" setup>
import { animate, type PanInfo } from "motion";
import { motion } from "motion-v";
import { EASE } from "~/types/easings";

const { truckSpeed, fuel } = useEtsTelemetry();

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

const { kmToUserUnits, literToUserUnits, speedUnit, fuelUnit } =
    useUnitConversion();

const remainingRestPercentage = ref(100);

const truckSpeedConverted = computed(() => kmToUserUnits(truckSpeed.value));
const fuelConverted = computed(() => literToUserUnits(fuel.value));
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
                            <span class="manufacturer">Scania</span>
                            <span class="model">S 730</span>
                        </div>

                        <span class="total-odo">(43,210 km)</span>
                    </div>

                    <div class="fuel-pill">
                        <div class="fuel-title-wrapper">
                            <div class="fuel-title">
                                <Icon name="lucide:fuel" class="icon" />
                            </div>

                            <div class="fuel-percentage-wrapper">
                                <span>Fuel</span>

                                <div class="fuel-percentage">
                                    <span>(62</span>
                                    <span class="unit">%)</span>
                                </div>
                            </div>
                        </div>

                        <div class="remains-avg-wrapper">
                            <div class="fuel-unit-group">
                                <span>1.120</span>
                                <span class="unit">km</span>
                            </div>

                            <span class="dot"></span>

                            <div class="fuel-unit-group">
                                <span>73</span>
                                <span class="unit">L/100</span>
                            </div>
                        </div>
                    </div>

                    <ProgressBar
                        :progress="62"
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
                            <p class="card-value-number">88</p>

                            <p class="card-value-unit">mph</p>
                        </div>

                        <ProgressBar
                            :progress="92"
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
                            <p class="card-value-number">43</p>

                            <p class="card-value-unit">%</p>
                        </div>

                        <ProgressBar
                            :progress="43"
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
                        v-if="activeTab === 'currentJob'"
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
                                    <span class="city">Berlin</span>
                                    <span class="company">LKWLog</span>
                                </div>

                                <div class="route-track">
                                    <div class="distance-badge">
                                        <span class="dist">745</span>
                                        <span class="unit">km</span>
                                    </div>
                                    <div class="line-with-arrow">
                                        <div class="line"></div>
                                    </div>
                                </div>

                                <div class="location-group destination">
                                    <span class="city">Paris</span>
                                    <span class="company">Kaarfor</span>
                                </div>
                            </div>

                            <div class="cargo-display">
                                <div class="cargo-group left">
                                    <span class="cargo-title">Cargo</span>
                                    <span class="cargo-value"
                                        >Medical Vaccines</span
                                    >
                                </div>

                                <div class="cargo-group right">
                                    <span class="cargo-title">Weight</span>
                                    <div class="weight-wrapper">
                                        <span class="cargo-value">18.4</span>
                                        <span class="unit">t</span>
                                    </div>
                                </div>
                            </div>

                            <div class="cargo-display">
                                <div class="cargo-group left">
                                    <span class="cargo-title">Remains</span>
                                    <div class="remains-wrapper">
                                        <div class="time">
                                            <span class="cargo-value">14</span>
                                            <span class="unit white">h</span>
                                        </div>

                                        <div class="time">
                                            <span class="cargo-value">20</span>
                                            <span class="unit white">m</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="cargo-group right">
                                    <span class="cargo-title">Wear</span>
                                    <div class="weight-wrapper">
                                        <span class="cargo-value">0.0</span>
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

                                <span class="payout-amount">€34,250</span>
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="activeTab === 'vehicleWear'"
                        class="card delivery-info"
                    >
                        <div class="card-title-wrapper">
                            <p class="card-title">Vehicle Wear</p>
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
                                    <div class="percentage-wrapper">
                                        <span>89</span>
                                        <span class="percentage">%</span>
                                    </div>

                                    <ProgressBar
                                        :progress="43"
                                        :bar-height="4"
                                        class="full-width-bar"
                                    />
                                </div>
                            </div>

                            <div class="damage-data-wrapper">
                                <Icon
                                    name="tabler:manual-gearbox"
                                    class="damage-icon"
                                />

                                <div class="progress-percentage-wrapper">
                                    <div class="percentage-wrapper">
                                        <span>76</span>
                                        <span class="percentage">%</span>
                                    </div>

                                    <ProgressBar
                                        :progress="43"
                                        :bar-height="4"
                                        class="full-width-bar"
                                    />
                                </div>
                            </div>

                            <div class="damage-data-wrapper">
                                <Icon name="tabler:truck" class="damage-icon" />

                                <div class="progress-percentage-wrapper">
                                    <div class="percentage-wrapper">
                                        <span>52</span>
                                        <span class="percentage">%</span>
                                    </div>

                                    <ProgressBar
                                        :progress="43"
                                        :bar-height="4"
                                        class="full-width-bar"
                                    />
                                </div>
                            </div>

                            <div class="damage-data-wrapper">
                                <Icon
                                    name="tabler:car-4wd"
                                    class="damage-icon"
                                />

                                <div class="progress-percentage-wrapper">
                                    <div class="percentage-wrapper">
                                        <span>92</span>
                                        <span class="percentage">%</span>
                                    </div>

                                    <ProgressBar
                                        :progress="43"
                                        :bar-height="4"
                                        class="full-width-bar"
                                    />
                                </div>
                            </div>

                            <div class="damage-data-wrapper">
                                <Icon name="tabler:wheel" class="damage-icon" />

                                <div class="progress-percentage-wrapper">
                                    <div class="percentage-wrapper">
                                        <span>100</span>
                                        <span class="percentage">%</span>
                                    </div>

                                    <ProgressBar
                                        :progress="43"
                                        :bar-height="4"
                                        class="full-width-bar"
                                    />
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
