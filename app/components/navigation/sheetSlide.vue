<script lang="ts" setup>
const props = defineProps<{
    isSheetHidden: boolean;
    truckSpeed: number;
    speedLimit: number;
    destinationName: string;
    routeEta: string;
    routeDistance: number;
    isNavigating: boolean;
    onStopNavigation: () => void;
    onStartNavigation: () => void;
}>();

const { kmToUserUnits, distanceUnit } = useUnitConversion();

const routeDistanceConverted = computed(() =>
    kmToUserUnits(props.routeDistance),
);

const emit = defineEmits<{
    (e: "update:isSheetHidden", value: boolean): void;
    (e: "update:isSheetExpanded", value: boolean): void;
}>();

const onToggleSheetHidden = () => {
    emit("update:isSheetHidden", !props.isSheetHidden);
};
</script>

<template>
    <div class="bottom-sheet" :class="{ 'is-hidden': isSheetHidden }">
        <div class="sheet-body">
            <Transition name="compact-slide">
                <CompactTrip
                    v-if="isSheetHidden"
                    v-on:click="onToggleSheetHidden"
                    class="compact-trip-progress"
                    :route-distance-converted="routeDistanceConverted"
                    :distance-unit="distanceUnit"
                    :route-eta="routeEta"
                />
            </Transition>

            <div class="sheet-content">
                <div class="top-row">
                    <h2 class="dest-name">{{ destinationName }}</h2>

                    <div class="hide-sheet">
                        <button
                            v-show="!isSheetHidden"
                            @click.prevent="onToggleSheetHidden"
                            class="hide-sheet-btn nav-btn"
                        >
                            <Icon
                                name="lucide:chevron-down"
                                class="chevron-icon"
                                size="20"
                            />
                            Hide
                        </button>
                    </div>
                </div>

                <div class="separator"></div>

                <div class="full-stats">
                    <div class="stat-block">
                        <Icon
                            name="lucide:clock-check"
                            size="26"
                            class="icon-eta"
                        />
                        <div>
                            <div class="value">{{ routeEta }}</div>
                            <div class="label">Estimated Time</div>
                        </div>
                    </div>

                    <div class="stat-block">
                        <Icon name="lucide:ruler" size="26" class="icon-dist" />
                        <div>
                            <div class="value">
                                {{ routeDistanceConverted }} {{ distanceUnit }}
                            </div>
                            <div class="label">Distance</div>
                        </div>
                    </div>
                </div>

                <div class="action-buttons">
                    <button
                        v-show="isNavigating"
                        class="stop-btn nav-btn"
                        @click.prevent="onStopNavigation"
                    >
                        <span>Stop</span>
                    </button>

                    <button
                        class="start-btn nav-btn"
                        @click.prevent="onStartNavigation"
                    >
                        <Icon name="lucide:map-pin-check" size="24" />
                        <span>{{
                            isNavigating ? "Resume" : "Start Navigation"
                        }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/sheetSlide.scss"
></style>
