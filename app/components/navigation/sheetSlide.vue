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
                <div
                    v-if="isSheetHidden"
                    v-on:click="onToggleSheetHidden"
                    class="compact-trip-progress"
                >
                    <Icon name="lets-icons:road-finish-fill" size="22" />
                    <div class="right">
                        <span
                            >{{ routeDistanceConverted }} {{ distanceUnit }},
                        </span>
                        <span>{{ routeEta }}</span>
                    </div>
                </div>
            </Transition>

            <div class="sheet-content">
                <div class="top-row">
                    <h2 class="dest-name">{{ destinationName }}</h2>

                    <div class="hide-sheet">
                        <button
                            @click.prevent="onToggleSheetHidden"
                            class="hide-sheet-btn nav-btn"
                        >
                            <Icon
                                :name="
                                    isSheetHidden
                                        ? 'bxs:chevron-up'
                                        : 'bxs:chevron-down'
                                "
                                class="chevron-icon"
                                size="18"
                            />
                            {{ isSheetHidden ? "" : "Hide" }}
                        </button>
                    </div>
                </div>

                <div class="separator"></div>

                <div class="full-stats">
                    <div class="stat-block">
                        <Icon
                            name="tabler:clock-filled"
                            size="26"
                            class="icon-eta"
                        />
                        <div>
                            <div class="value">{{ routeEta }}</div>
                            <div class="label">Estimated Time</div>
                        </div>
                    </div>

                    <div class="stat-block">
                        <Icon
                            name="tabler:ruler-2"
                            size="26"
                            class="icon-dist"
                        />
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
                        @click.prevent="
                            isNavigating
                                ? onToggleSheetHidden()
                                : onStartNavigation()
                        "
                    >
                        <Icon name="tabler:navigation-check" size="24" />
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
