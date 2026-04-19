<script lang="ts" setup>
import { generateTruckIcon } from "~/assets/utils/map/markers";

const { settings, activeSettings, updateProfile, DEFAULT_SETTINGS } =
    useSettings();

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
        <ColorOption option-title="Theme" color-element="themeColor">
            <template #icon>
                <Icon name="lucide:palette" size="24" />
            </template>
        </ColorOption>

        <ColorOption option-title="Route" color-element="routeColor">
            <template #icon>
                <Icon name="lucide:route" size="24" />
            </template>
        </ColorOption>

        <div class="small-separator"></div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:type-outline" size="24" />
                <p>Text Theme</p>
            </div>

            <div class="segmented-control" @click="toggleTextColor">
                <button
                    class="segment-btn"
                    :class="{ active: isTextThemeLight }"
                >
                    <span class="label">Light</span>
                </button>

                <button
                    class="segment-btn"
                    :class="{ active: !isTextThemeLight }"
                >
                    <span class="label">Dark</span>
                </button>
            </div>
        </div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:type" size="24" />
                <p>App Font</p>
            </div>

            <USelect
                :model-value="activeSettings.fontFamily"
                @update:model-value="(val) => updateFont(val)"
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
            option-title="Hud Button Size"
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
            option-title="Truck Marker Size"
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
            option-title="Compact Trip Size"
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
                <p>Driving Info</p>
            </div>
            <div class="owned-dlcs">
                <button
                    @click.prevent="toggleDriveInfoPanel"
                    class="nav-btn settings-btn"
                >
                    {{ settings.activeUiComponents.length }} /
                    {{ DEFAULT_SETTINGS.activeUiComponents.length }}
                    active
                </button>
            </div>
        </div>

        <Transition name="panel-pop">
            <PopupPanel
                v-if="isDriveInfoOpened"
                title="Select Components"
                @close="toggleDriveInfoPanel"
            >
                <ManageDriveInfoPanel />
            </PopupPanel>
        </Transition>
    </div>
</template>
