<script lang="ts" setup>
import { generateTruckIcon } from "~/assets/utils/map/markers";
import SegmentedControl from "../segmentedControl.vue";

const { settings, activeSettings, updateProfile, DEFAULT_SETTINGS } =
    useSettings();
const { t } = useTranslations();

const truckImgSrc = ref("");
const isDriveInfoOpened = ref(false);

const isTextThemeLight = computed(
    () => activeSettings.value.textColor === "light",
);

const items = ref([
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

watch(() => activeSettings.value.themeColor, updatePreviewIcon, {
    immediate: true,
});
</script>

<template>
    <div>
        <ColorOption
            :option-title="t('settings.theme')"
            color-element="themeColor"
        >
            <template #icon>
                <Icon name="lucide:palette" size="24" />
            </template>
        </ColorOption>

        <ColorOption
            :option-title="t('settings.route')"
            color-element="routeColor"
        >
            <template #icon>
                <Icon name="lucide:milestone" size="24" />
            </template>
        </ColorOption>

        <div class="small-separator"></div>

        <ColorOption
            :option-title="t('settings.background')"
            color-element="backgroundColor"
        >
            <template #icon>
                <Icon name="lucide:waves" size="24" />
            </template>
        </ColorOption>

        <ColorOption
            :option-title="t('settings.land')"
            color-element="landColor"
        >
            <template #icon>
                <Icon name="lucide:mountain" size="24" />
            </template>
        </ColorOption>

        <ColorOption
            :option-title="t('settings.roads')"
            color-element="roadColor"
        >
            <template #icon>
                <Icon name="lucide:route" size="24" />
            </template>
        </ColorOption>

        <PreviewSetting :height="240">
            <MapColorPreview />
        </PreviewSetting>

        <div class="small-separator"></div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:type-outline" size="24" />
                <p>{{ t("settings.textTheme") }}</p>
            </div>

            <SegmentedControl
                :left-option="t('settings.light')"
                :right-option="t('settings.dark')"
                :is-same-color="true"
                @connect="toggleTextColor"
                :active="isTextThemeLight"
                size="normal"
            />
        </div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:type" size="24" />
                <p>{{ t("settings.appFont") }}</p>
            </div>

            <USelect
                :model-value="activeSettings.fontFamily"
                @update:model-value="(val: string) => updateFont(val)"
                :items="items"
                variant="none"
                class="selector"
                :ui="{
                    trailingIcon: 'shrink-0 size-[20px] text-white !px-6',
                    content: 'bg-[#222e3c] shadow-xl rounded-md',
                    item: 'flex items-center justify-between text-[1.6rem] font-BOLD !py-2 !px-3 text-[#f2f2f2] data-[highlighted]:bg-[#3d546e] rounded cursor-pointer transition-colors',
                    itemTrailingIcon: 'text-white',
                }"
            >
                <template #item="{ item }">
                    <span :style="{ fontFamily: item }">
                        {{ item }}
                    </span>
                </template>
            </USelect>
        </div>

        <div class="small-separator"></div>

        <IncreaseOption
            :option-title="t('settings.hudButtonSize')"
            setting-name="hudBtnSize"
            :max-value="40"
            :min-value="20"
            :amount="1"
        >
            <template #icon>
                <Icon name="lucide:square-plus" size="24" />
            </template>
        </IncreaseOption>

        <PreviewSetting :height="70">
            <HudButton v-on:click="null">
                <Icon name="lucide:star" class="icon" />
            </HudButton>
        </PreviewSetting>

        <IncreaseOption
            :option-title="t('settings.truckMarkerSize')"
            setting-name="truckMarkerSize"
            :max-value="70"
            :min-value="25"
            :amount="1"
        >
            <template #icon>
                <Icon name="lucide:map-pin-plus" size="24" />
            </template>
        </IncreaseOption>

        <PreviewSetting :height="70">
            <div
                class="actual-truck-preview"
                :style="{
                    width: settings.truckMarkerSize + 'px',
                    height: settings.truckMarkerSize + 'px',
                    backgroundImage: `url('${truckImgSrc}')`,
                }"
            ></div>
        </PreviewSetting>

        <IncreaseOption
            :option-title="t('settings.compactTripSize')"
            setting-name="compactTripFontSize"
            :max-value="2.5"
            :min-value="1.2"
            :amount="0.1"
        >
            <template #icon>
                <Icon name="lucide:circle-plus" size="24" />
            </template>
        </IncreaseOption>

        <PreviewSetting :height="100">
            <CompactTrip
                class="compact-trip-progress preview"
                :route-distance-converted="999"
                distance-unit="mi"
                route-eta="9h 59min"
            />
        </PreviewSetting>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:circle-gauge" size="24" />
                <p>{{ t("settings.drivingInfo") }}</p>
            </div>
            <div class="owned-dlcs">
                <button
                    @click.prevent="toggleDriveInfoPanel"
                    class="nav-btn settings-btn"
                >
                    {{ settings.activeUiComponents.length }} /
                    {{ DEFAULT_SETTINGS.activeUiComponents.length }}
                    {{ t("common.active") }}
                </button>
            </div>
        </div>

        <Transition name="panel-pop">
            <PopupPanel
                v-if="isDriveInfoOpened"
                :title="t('settings.selectComponents')"
                @close="toggleDriveInfoPanel"
            >
                <ManageDriveInfoPanel />
            </PopupPanel>
        </Transition>
    </div>
</template>
