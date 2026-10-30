<script lang="ts" setup>
import { generateTruckIcon } from "~/assets/utils/map/markers";

const { activeSettings, updateProfile } = useSettings();
const { t } = useTranslations();

const isFontSelectOpened = ref(false);
const truckImgSrc = ref("");

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

function toggleTextColor() {
    updateProfile("textColor", isTextThemeLight.value ? "dark" : "light");
}

function updateFont(val: string) {
    updateProfile("fontFamily", val);
}

function toggleFontSelectPanel() {
    isFontSelectOpened.value = !isFontSelectOpened.value;
}

function toggleOuterRim() {
    updateProfile("outerRimEnabled", !activeSettings.value.outerRimEnabled);
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
    ],
    updatePreviewIcon,
    {
        immediate: true,
    },
);
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
                <p class="category-title small">Truck Marker</p>

                <div class="items-wrapper-stacked">
                    <ColorOption
                        :option-title="t('settings.arrow')"
                        color-element="arrowColor"
                    >
                        <template #icon>
                            <div class="icon-wrapper">
                                <Icon name="lucide:navigation-2" class="icon" />
                            </div>
                        </template>
                    </ColorOption>

                    <div class="small-separator"></div>

                    <ColorOption
                        :option-title="t('settings.disc')"
                        color-element="discColor"
                    >
                        <template #icon>
                            <div class="icon-wrapper">
                                <Icon name="ic:baseline-circle" class="icon" />
                            </div>
                        </template>
                    </ColorOption>

                    <div class="small-separator"></div>

                    <ColorOption
                        :option-title="t('settings.rimColor')"
                        color-element="rimColor"
                    >
                        <template #icon>
                            <div class="icon-wrapper">
                                <Icon name="lucide:circle" class="icon" />
                            </div>
                        </template>
                    </ColorOption>

                    <div class="option setting stacked" @click="toggleOuterRim">
                        <div class="option-title">
                            <div class="icon-wrapper">
                                <Icon name="lucide:circle-check" class="icon" />
                            </div>

                            <p>{{ t("settings.outerRim") }}</p>
                        </div>

                        <Switch v-model="activeSettings.outerRimEnabled" />
                    </div>

                    <PreviewSetting :height="40">
                        <div
                            class="actual-truck-preview truck-nav-marker"
                            :style="{
                                width: '50px',
                                height: '50px',
                                backgroundImage: `url('${truckImgSrc}')`,
                            }"
                        ></div>
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
        </div>
    </div>
</template>
