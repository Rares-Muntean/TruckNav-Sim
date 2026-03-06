<script lang="ts" setup>
import { ets2Expansions } from "~/data/ets2/ets2Expansions";
import { atsExpansions } from "~/data/ats/atsExpansions";
import { computed } from "vue"

const props = defineProps<{ closePanel: () => void }>();

const isDlcPanelOpened = ref(false);
const { settings, activeSettings, updateGlobal } = useSettings();
const isMetric = computed(() => settings.value.units === "metric")
const toggleDlcPanel = () => {
    isDlcPanelOpened.value = !isDlcPanelOpened.value;
};

const selectedExpansion = computed(() => {
    return settings.value.selectedGame === "ets2"
        ? ets2Expansions
        : atsExpansions;
});

function toggleUnits() {
    updateGlobal("units", isMetric.value ? "imperial" : "metric")
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
            <div class="owned-dlcs">
                <button
                    @click="toggleUnits"
                    class="unit-toggle"
                >
                    {{ isMetric ? "Metric (km/h)" : "Imperial (mph)" }}
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
