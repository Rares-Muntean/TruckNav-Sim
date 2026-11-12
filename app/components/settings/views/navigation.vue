<script lang="ts" setup>
import { generateTruckIcon } from "~/assets/utils/map/markers";
import { anim } from "~/assets/utils/animations/anim";

const {
    settings,
    activeSettings,
    updateGlobal,
    updateProfile,
    DEFAULT_SETTINGS,
} = useSettings();

const { t } = useTranslations();

const hasGuidedNavigation = computed(
    () => activeSettings.value.hasTurnNavigation === true,
);
const hasDrawTurnNavigation = computed(
    () => activeSettings.value.drawTurnNavigation === true,
);

const usesGameTime = computed(() => settings.value.routeTimeMode === "game");
const truckImgSrc = ref("");

const isDriveInfoOpened = ref(false);

const activeTab = inject<Ref<"drive" | "trip" | "settings">>("activeTab");
if (activeTab) {
    watch(activeTab, (newV) => {
        if (newV !== "settings") {
            isDriveInfoOpened.value = false;
        }
    });
}

function toggleGuidedNavigation() {
    updateProfile("hasTurnNavigation", !hasGuidedNavigation.value);
}

function toggleDrawTurnNavigation() {
    updateProfile("drawTurnNavigation", !hasDrawTurnNavigation.value);
}

function toggleRouteTimeMode() {
    updateGlobal("routeTimeMode", usesGameTime.value ? "real" : "game");
}

function toggleDriveInfoPanel() {
    isDriveInfoOpened.value = !isDriveInfoOpened.value;
}

async function updatePreviewIcon() {
    const img = await generateTruckIcon(
        activeSettings.value.arrowColor,
        activeSettings.value.discColor,
        activeSettings.value.rimColor,
    );
    truckImgSrc.value = img.src;
}

watch(
    [
        () => activeSettings.value.arrowColor,
        () => activeSettings.value.discColor,
        () => activeSettings.value.rimColor,
        () => activeSettings.value.outerRimEnabled,
    ],
    updatePreviewIcon,
    {
        immediate: true,
    },
);

function handlePanelEnter(el: Element, done: () => void, query: string) {
    anim.panelEnter(el, done);

    const list = el.querySelector(`.${query}`) as HTMLElement;
    if (list) {
        anim.staggerListX(list, 0.04);
    }
}
</script>

<template>
    <div>
        <div class="menu-list">
            <div class="category-wrapper">
                <p class="category-title small">
                    {{ t("settings.guidanceTime") }}
                </p>

                <div class="items-wrapper-stacked">
                    <div
                        class="option setting stacked"
                        @click="toggleGuidedNavigation"
                    >
                        <div class="option-title">
                            <div class="icon-wrapper">
                                <Icon name="lucide:navigation-2" class="icon" />
                            </div>

                            <p>{{ t("settings.guidedNavigation") }}</p>
                        </div>

                        <Switch :is-active="hasGuidedNavigation" />
                    </div>

                    <div class="small-separator"></div>

                    <div
                        class="option setting stacked"
                        @click="toggleRouteTimeMode"
                    >
                        <div class="option-title">
                            <div class="icon-wrapper">
                                <Icon name="lucide:clock-3" class="icon" />
                            </div>

                            <p>{{ t("settings.estimatedTime") }}</p>
                        </div>

                        <SegmentedControl
                            :left-option="t('settings.gameTime')"
                            :right-option="t('settings.realTime')"
                            size="normal"
                            :active="usesGameTime"
                        />
                    </div>
                </div>
            </div>

            <div class="category-wrapper">
                <p class="category-title small">
                    {{ t("settings.hudSizing") }}
                </p>

                <div class="items-wrapper">
                    <div class="items-wrapper-stacked">
                        <div class="preview-increase">
                            <IncreaseOption
                                option-title="App Sizing"
                                setting-name="uiScale"
                                :max-value="125"
                                :min-value="80"
                                :amount="1"
                                unit="%"
                            >
                                <template #icon>
                                    <div class="icon-wrapper">
                                        <Icon
                                            name="lucide:copy-plus"
                                            class="icon"
                                        />
                                    </div>
                                </template>
                            </IncreaseOption>
                        </div>
                    </div>

                    <div class="items-wrapper-stacked">
                        <div class="preview-increase">
                            <IncreaseOption
                                :option-title="t('settings.hudButtonSize')"
                                setting-name="hudBtnSize"
                                :max-value="40"
                                :min-value="20"
                                :amount="1"
                                unit="px"
                            >
                                <template #icon>
                                    <div class="icon-wrapper">
                                        <Icon
                                            name="lucide:square-plus"
                                            class="icon"
                                        />
                                    </div>
                                </template>
                            </IncreaseOption>

                            <PreviewSetting :height="40">
                                <HudButton v-on:click="null">
                                    <Icon name="lucide:star" class="icon" />
                                </HudButton>
                            </PreviewSetting>
                        </div>
                    </div>

                    <div class="items-wrapper-stacked">
                        <div class="preview-increase">
                            <IncreaseOption
                                :option-title="t('settings.truckMarkerSize')"
                                setting-name="truckMarkerSize"
                                :max-value="70"
                                :min-value="25"
                                :amount="1"
                                unit="px"
                            >
                                <template #icon>
                                    <div class="icon-wrapper">
                                        <Icon
                                            name="lucide:map-pin-plus"
                                            class="icon"
                                        />
                                    </div>
                                </template>
                            </IncreaseOption>

                            <PreviewSetting :height="40">
                                <div
                                    class="actual-truck-preview truck-nav-marker"
                                    :style="{
                                        width: settings.truckMarkerSize + 'px',
                                        height: settings.truckMarkerSize + 'px',
                                        backgroundImage: `url('${truckImgSrc}')`,
                                    }"
                                ></div>
                            </PreviewSetting>
                        </div>
                    </div>

                    <div class="items-wrapper-stacked">
                        <div class="preview-increase">
                            <IncreaseOption
                                :option-title="t('settings.compactTripSize')"
                                setting-name="compactTripFontSize"
                                :max-value="2.5"
                                :min-value="1.2"
                                :amount="0.1"
                                unit="x"
                            >
                                <template #icon>
                                    <div class="icon-wrapper">
                                        <Icon
                                            name="lucide:circle-plus"
                                            class="icon"
                                        />
                                    </div>
                                </template>
                            </IncreaseOption>

                            <PreviewSetting :height="70">
                                <CompactTrip
                                    class="compact-trip-progress preview"
                                    :route-distance-converted="999"
                                    distance-unit="mi"
                                    route-eta-hours="9"
                                    route-eta-minutes="59"
                                />
                            </PreviewSetting>
                        </div>
                    </div>

                    <div class="items-wrapper-stacked">
                        <div
                            class="option setting stacked"
                            @click="toggleDrawTurnNavigation"
                        >
                            <div class="option-title">
                                <div class="icon-wrapper">
                                    <Icon
                                        name="lucide:corner-up-right"
                                        class="icon"
                                    />
                                </div>

                                <p>{{ t("settings.turnArrows") }}</p>
                            </div>

                            <Switch :is-active="hasDrawTurnNavigation" />
                        </div>

                        <div
                            class="option setting"
                            @click.prevent="toggleDriveInfoPanel"
                        >
                            <div class="option-title">
                                <div class="icon-wrapper">
                                    <Icon name="lucide:info" class="icon" />
                                </div>

                                <p>{{ t("settings.drivingInfo") }}</p>
                            </div>

                            <div class="option-action">
                                <div class="owned-dlcs">
                                    <span class="setting-button-text">
                                        {{ settings.activeUiComponents.length }}
                                        /
                                        {{
                                            DEFAULT_SETTINGS.activeUiComponents
                                                .length
                                        }}
                                    </span>
                                </div>

                                <Icon
                                    name="lucide:chevron-right"
                                    class="chevron"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <Transition
            mode="out-in"
            @enter="
                (el, done) =>
                    handlePanelEnter(el, done, 'manage-drive-info-wrapper')
            "
            @leave="anim.panelLeave"
        >
            <Teleport to=".ui-safe-container">
                <PopupPanel
                    v-if="isDriveInfoOpened"
                    @close="toggleDriveInfoPanel"
                >
                    <template #category-title>{{
                        t("settings.drivingHud")
                    }}</template>
                    <template #category-description>{{
                        t("settings.drivingHudDescription")
                    }}</template>

                    <ManageDriveInfoPanel />
                </PopupPanel>
            </Teleport>
        </Transition>
    </div>
</template>
