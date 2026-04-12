<script lang="ts" setup>
import { ets2Expansions } from "~/data/ets2/ets2Expansions";
import { atsExpansions } from "~/data/ats/atsExpansions";

const { settings, activeSettings, updateProfile, updateGlobal } = useSettings();

const props = defineProps<{ closePanel: () => void }>();

const isDlcPanelOpened = ref(false);
const isMetric = computed(() => activeSettings.value.units === "metric");
const isTextThemeLight = computed(
    () => activeSettings.value.textColor === "light",
);
const hasGuidedNavigation = computed(
    () => settings.value.hasTurnNavigation === true,
);

const selectedExpansion = computed(() => {
    return settings.value.selectedGame === "ets2"
        ? ets2Expansions
        : atsExpansions;
});

const toggleDlcPanel = () => {
    isDlcPanelOpened.value = !isDlcPanelOpened.value;
};

function toggleTextColor() {
    updateProfile("textColor", isTextThemeLight.value ? "dark" : "light");
}

function toggleUnits() {
    updateProfile("units", isMetric.value ? "imperial" : "metric");
}

function toggleGuidedNavigation() {
    updateGlobal("hasTurnNavigation", hasGuidedNavigation.value ? false : true);
}
</script>

<template>
    <div class="settings-panel">
        <div class="settings-title setting">
            <div class="icon-btn" v-on:click="closePanel">
                <Icon name="material-symbols:arrow-back-rounded" size="26" />
            </div>

            <div class="title-icon">
                <Icon name="lucide:settings" size="38" />

                <div>
                    <p class="panel-title">Settings</p>
                    <p class="panel-description">
                        App preferences and customization
                    </p>
                </div>
            </div>
        </div>

        <div class="separator"></div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:map-plus" size="24" />
                <p>Owned DLCs</p>
            </div>
            <div class="owned-dlcs">
                <button
                    @click.prevent="toggleDlcPanel"
                    class="nav-btn settings-btn default-color"
                >
                    {{ activeSettings.ownedDlcs.length }} /
                    {{ Object.keys(selectedExpansion).length }} active
                </button>
            </div>
        </div>

        <ColorOption
            option-title="Theme"
            icon-name="lucide:palette"
            color-element="themeColor"
        />

        <ColorOption
            option-title="Route"
            icon-name="lucide:route"
            color-element="routeColor"
        />

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
                <Icon name="lucide:ruler" size="24" />
                <p>Units</p>
            </div>

            <div class="segmented-control" @click="toggleUnits">
                <button class="segment-btn" :class="{ active: isMetric }">
                    <span class="label">Metric</span>
                </button>

                <button class="segment-btn" :class="{ active: !isMetric }">
                    <span class="label">Imperial</span>
                </button>
            </div>
        </div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:navigation-2" size="24" />
                <p>Guided Navigation</p>
            </div>

            <div class="segmented-control" @click="toggleGuidedNavigation">
                <button
                    class="segment-btn"
                    :class="{ active: hasGuidedNavigation }"
                >
                    <span class="label">On</span>
                </button>

                <button
                    class="segment-btn"
                    :class="{ activeOff: !hasGuidedNavigation }"
                >
                    <span class="label">Off</span>
                </button>
            </div>
        </div>

        <Transition name="panel-pop">
            <ManageDlcsWindow
                v-if="isDlcPanelOpened"
                :close-panel="toggleDlcPanel"
            />
        </Transition>
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/settingsPanel.scss"
></style>
