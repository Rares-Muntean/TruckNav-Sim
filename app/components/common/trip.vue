<script lang="ts" setup>
import { animate, type PanInfo } from "motion";
import { motion } from "motion-v";

const { hasActiveJob } = useEtsTelemetry();

const props = defineProps<{
    routeDistanceConverted: number;
}>();

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
</script>

<template>
    <section class="section-trip">
        <div class="background-dim"></div>

        <div class="section trip-content safe-padding-left safe-padding-right">
            <div class="trip-col-left">
                <VehicleCard />

                <div class="speed-sleep">
                    <SpeedCard />

                    <RestCard />
                </div>
            </div>

            <div class="trip-col-right">
                <motion.div
                    @click="toggleCardview"
                    @pan-end="handleDragEnd"
                    class="trip-info"
                >
                    <AnimTransition type="fade">
                        <JobCard
                            :route-distance-converted="routeDistanceConverted"
                            v-if="activeTab === 'currentJob' && hasActiveJob"
                        />

                        <FreeroamCard v-else-if="activeTab === 'currentJob'" />

                        <DamageCard v-if="activeTab === 'vehicleWear'" />
                    </AnimTransition>

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
