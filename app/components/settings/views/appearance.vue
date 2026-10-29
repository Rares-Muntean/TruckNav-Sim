<script lang="ts" setup>
import { generateTruckIcon } from "~/assets/utils/map/markers";
import SegmentedControl from "../segmentedControl.vue";

const { settings, activeSettings, updateProfile, DEFAULT_SETTINGS } =
    useSettings();
const { t } = useTranslations();

const truckImgSrc = ref("");
const isDriveInfoOpened = ref(false);
const isFontSelectOpened = ref(false);

const isTextThemeLight = computed(
    () => activeSettings.value.textColor === "light",
);

const fontItems = ref([
    "Jakarta",
    "Quicksand",
    "Roboto",
    "Exo-2",
    "Montserrat",
    "Oxanium",
    "Rubik",
    "Open-Sans",
    "Nunito",
    "Karla",
    "Commissioner",
]);

async function updatePreviewIcon() {
    const img = await generateTruckIcon(activeSettings.value.themeColor);
    truckImgSrc.value = img.src;
}

function toggleTextColor() {
    updateProfile("textColor", isTextThemeLight.value ? "dark" : "light");
}

function updateFont(val: string) {
    updateProfile("fontFamily", val);
}

function toggleDriveInfoPanel() {
    isDriveInfoOpened.value = !isDriveInfoOpened.value;
}

function toggleFontSelectPanel() {
    isFontSelectOpened.value = !isFontSelectOpened.value;
}

watch(() => activeSettings.value.themeColor, updatePreviewIcon, {
    immediate: true,
});
</script>

<template>
    <div>
        <div class="menu-list">
            <div class="category-wrapper">
                <p class="category-title small">COLORS & MAP</p>

                <div class="items-wrapper-stacked">
                    <ColorOption
                        :option-title="t('settings.theme')"
                        color-element="themeColor"
                    >
                        <template #icon>
                            <div class="icon-wrapper">
                                <Icon name="lucide:palette" class="icon" />
                            </div>
                        </template>
                    </ColorOption>

                    <div class="small-separator"></div>

                    <ColorOption
                        :option-title="t('settings.route')"
                        color-element="routeColor"
                    >
                        <template #icon>
                            <div class="icon-wrapper">
                                <Icon name="lucide:milestone" class="icon" />
                            </div>
                        </template>
                    </ColorOption>

                    <div class="small-separator"></div>

                    <ColorOption
                        :option-title="t('settings.background')"
                        color-element="backgroundColor"
                    >
                        <template #icon>
                            <div class="icon-wrapper">
                                <Icon name="lucide:waves" class="icon" />
                            </div>
                        </template>
                    </ColorOption>

                    <div class="small-separator"></div>

                    <ColorOption
                        :option-title="t('settings.land')"
                        color-element="landColor"
                    >
                        <template #icon>
                            <div class="icon-wrapper">
                                <Icon name="lucide:mountain" class="icon" />
                            </div>
                        </template>
                    </ColorOption>

                    <div class="small-separator"></div>

                    <ColorOption
                        :option-title="t('settings.roads')"
                        color-element="roadColor"
                    >
                        <template #icon>
                            <div class="icon-wrapper">
                                <Icon name="lucide:route" class="icon" />
                            </div>
                        </template>
                    </ColorOption>

                    <PreviewSetting :height="150">
                        <MapColorPreview />
                    </PreviewSetting>
                </div>
            </div>

            <div class="category-wrapper">
                <p class="category-title small">Typography</p>

                <div class="items-wrapper-stacked">
                    <div
                        class="option setting stacked"
                        @click="toggleTextColor"
                    >
                        <div class="option-title">
                            <div class="icon-wrapper">
                                <Icon name="lucide:type-outline" class="icon" />
                            </div>

                            <p>{{ t("settings.textTheme") }}</p>
                        </div>

                        <SegmentedControl
                            :left-option="t('settings.light')"
                            :right-option="t('settings.dark')"
                            :active="isTextThemeLight"
                            size="normal"
                        />
                    </div>

                    <div class="small-separator"></div>

                    <div
                        class="option setting stacked"
                        @click.self="toggleFontSelectPanel"
                    >
                        <div
                            @click.stop="toggleFontSelectPanel"
                            class="option-title"
                        >
                            <div class="icon-wrapper">
                                <Icon name="lucide:type" class="icon" />
                            </div>

                            <p>{{ t("settings.appFont") }}</p>
                        </div>

                        <div
                            @click.stop="toggleFontSelectPanel"
                            class="option-action"
                        >
                            <span class="setting-button-text">
                                {{ activeSettings.fontFamily }}
                            </span>

                            <Icon
                                name="lucide:chevron-right"
                                class="chevron translate-y"
                            />
                        </div>

                        <PopupPanel
                            v-if="isFontSelectOpened"
                            @close="toggleFontSelectPanel"
                        >
                            <template #category-title>Typography</template>
                            <template #category-description
                                >Choose a font that matches your style</template
                            >

                            <div class="fonts-content">
                                <div class="fonts">
                                    <div
                                        v-for="font in fontItems"
                                        class="font"
                                        :class="{
                                            active:
                                                activeSettings.fontFamily ===
                                                font,
                                        }"
                                        @click="updateFont(font)"
                                    >
                                        <div
                                            class="font-showcase"
                                            :style="{ fontFamily: font }"
                                        >
                                            <p class="font-title">
                                                {{ font }}
                                            </p>

                                            <div class="font-lorem">
                                                <p class="lorem-title">
                                                    Rest stop in 45 km
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PopupPanel>
                    </div>
                </div>
            </div>

            <div class="category-wrapper">
                <p class="category-title small">Hud & Sizing</p>

                <div class="items-wrapper">
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
                                    class="actual-truck-preview"
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
                                    {{ settings.activeUiComponents.length }} /
                                    {{
                                        DEFAULT_SETTINGS.activeUiComponents
                                            .length
                                    }}
                                </span>
                            </div>

                            <Icon name="lucide:chevron-right" class="chevron" />
                        </div>
                    </div>
                </div>
            </div>

            <PopupPanel v-if="isDriveInfoOpened" @close="toggleDriveInfoPanel">
                <template #category-title>DRIVING HUD</template>
                <template #category-description
                    >Toggle on-screen driving HUD</template
                >

                <ManageDriveInfoPanel />
            </PopupPanel>
        </div>
    </div>
</template>
