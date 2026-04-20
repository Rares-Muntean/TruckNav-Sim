<script lang="ts" setup>
import { ets2Expansions } from "~/data/ets2/ets2Expansions";
import { atsExpansions } from "~/data/ats/atsExpansions";

const { settings, activeSettings, updateProfile, resetSettings } =
    useSettings();
const { locale, setLocale, t } = useTranslations();

const isDlcPanelOpened = ref(false);

const isMetric = computed(() => activeSettings.value.units === "metric");
const isGerman = computed(() => locale.value === "de");
const selectedExpansion = computed(() => {
    return settings.value.selectedGame === "ets2"
        ? ets2Expansions
        : atsExpansions;
});

function toggleUnits() {
    updateProfile("units", isMetric.value ? "imperial" : "metric");
}

function toggleLanguage() {
    setLocale(isGerman.value ? "en" : "de");
}

function toggleDlcPanel() {
    isDlcPanelOpened.value = !isDlcPanelOpened.value;
}
</script>

<template>
    <div>
        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:map-plus" size="24" />
                <p>{{ t("settings.ownedDlcs") }}</p>
            </div>
            <div class="owned-dlcs">
                <button
                    @click.prevent="toggleDlcPanel"
                    class="nav-btn settings-btn"
                >
                    {{ activeSettings.ownedDlcs.length }} /
                    {{ Object.keys(selectedExpansion).length }}
                    {{ t("common.active") }}
                </button>
            </div>
        </div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:languages" size="24" />
                <p>{{ t("settings.language") }}</p>
            </div>

            <div class="segmented-control" @click="toggleLanguage">
                <button class="segment-btn" :class="{ active: !isGerman }">
                    <span class="label">{{ t("settings.english") }}</span>
                </button>

                <button class="segment-btn" :class="{ active: isGerman }">
                    <span class="label">{{ t("settings.german") }}</span>
                </button>
            </div>
        </div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:ruler" size="24" />
                <p>{{ t("settings.units") }}</p>
            </div>

            <div class="segmented-control" @click="toggleUnits">
                <button class="segment-btn" :class="{ active: isMetric }">
                    <span class="label">{{ t("settings.metric") }}</span>
                </button>

                <button class="segment-btn" :class="{ active: !isMetric }">
                    <span class="label">{{ t("settings.imperial") }}</span>
                </button>
            </div>
        </div>

        <div class="small-separator"></div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:rotate-ccw" size="24" />
                <p>{{ t("settings.resetToDefaults") }}</p>
            </div>

            <button
                @click.prevent="resetSettings"
                class="nav-btn settings-btn red-color"
            >
                {{ t("common.reset") }}
            </button>
        </div>

        <Transition name="panel-pop">
            <PopupPanel
                v-if="isDlcPanelOpened"
                :title="t('common.chooseDlcs')"
                @close="toggleDlcPanel"
            >
                <ManageDlcsWindow />
            </PopupPanel>
        </Transition>
    </div>
</template>
