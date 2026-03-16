<script lang="ts" setup>
import { ets2Expansions } from "~/data/ets2/ets2Expansions";
import { atsExpansions } from "~/data/ats/atsExpansions";

const { settings, activeSettings, updateProfile } = useSettings();

const props = defineProps<{ closePanel: () => void }>();

const isDlcPanelOpened = ref(false);
const isMetric = computed(() => activeSettings.value.units === "metric");
const isRealisticCompanyNamesEnabled = computed(
    () => activeSettings.value.useRealisticCompanyNames
);

const selectedExpansion = computed(() => {
    return settings.value.selectedGame === "ets2"
        ? ets2Expansions
        : atsExpansions;
});

const toggleDlcPanel = () => {
    isDlcPanelOpened.value = !isDlcPanelOpened.value;
};

    function toggleUnits() {
        updateProfile("units", isMetric.value ? "imperial" : "metric");
    }

    function toggleRealisticCompanyNames() {
        updateProfile("useRealisticCompanyNames", !isRealisticCompanyNamesEnabled.value);
    }
</script>

<template>
    <div class="settings-panel">
        <div class="settings-title setting">
            <div class="icon-btn" v-on:click="closePanel">
                <Icon name="material-symbols:close-rounded" size="26" />
            </div>

            <div class="title-icon">
                <Icon name="flowbite:cog-outline" size="38" />

                <div>
                    <p class="panel-title">Settings</p>
                    <p class="panel-description">
                        App preferences and customization
                    </p>
                </div>
            </div>
        </div>

        <div class="separator"></div>

        <ColorOption
            option-title="Theme"
            icon-name="solar:pallete-2-linear"
            color-element="themeColor"
        />

        <ColorOption
            option-title="Route"
            icon-name="material-symbols:route-outline"
            color-element="routeColor"
        />

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
                <Icon name="lucide:map-plus" size="24" />
                <p>Enable Realistic Company Names Mod Compatability</p>
            </div>
            <div class="owned-dlcs">
                <div class="segmented-control" @click="toggleRealisticCompanyNames">
                    <button class="segment-btn" :class="{ active: isRealisticCompanyNamesEnabled }">
                        <span class="label">On</span>
                    </button>

                    <button class="segment-btn" :class="{ active: !isRealisticCompanyNamesEnabled }">
                        <span class="label">Off</span>
                    </button>
                </div>
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
