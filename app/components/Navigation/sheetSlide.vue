<script lang="ts" setup>
import { computed } from "vue"
import { useConversions } from "~/composables/UnitConversion"

const props = defineProps<{
    isSheetExpanded: boolean;
    isSheetHidden: boolean;
    truckSpeed: number;
    speedLimit: number;
    destinationName: string;
    routeEta: string;
    routeDistance: number;
    hasActiveJob: boolean;
    clearRouteState: () => void;
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

function onToggleSheet() {
    emit("update:isSheetExpanded", !props.isSheetExpanded);
}
</script>

<template>
    <div
        class="bottom-sheet"
        :class="{ 'is-expanded': isSheetExpanded, 'is-hidden': isSheetHidden }"
    >
        <div class="sheet-header" @click="onToggleSheet">
            <div class="drag-pill"></div>
        </div>

        <div class="sheet-body">
            <div class="hide-sheet">
                <button
                    v-if="!isSheetExpanded"
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

            <div class="top-row">
                <div class="trip-info" @click="onToggleSheet">
                    <h2 class="dest-name">{{ destinationName }}</h2>

                    <div class="mini-stats">
                        <span class="eta">{{ routeEta }}</span>
                        <span class="dist"
                            >({{ routeDistanceConverted }}
                            {{ distanceUnit }})</span
                        >
                    </div>
                </div>

                <button
                    v-if="!hasActiveJob"
                    class="cancel-btn nav-btn"
                    @click.stop="clearRouteState"
                >
                    <Icon name="material-symbols:close-rounded" size="24" />
                </button>
            </div>

            <div class="expanded-content">
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

                <div class="action-buttons" @click.prevent="onStartNavigation">
                    <button class="start-btn nav-btn">
                        <Icon name="tabler:navigation-check" size="24" />
                        <span>Start Navigation</span>
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
