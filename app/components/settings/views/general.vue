<script lang="ts" setup>
import { ets2Expansions } from "~/data/ets2/ets2Expansions";
import { atsExpansions } from "~/data/ats/atsExpansions";

const { settings, activeSettings, updateProfile, resetSettings } =
    useSettings();
const { locale, setLocale, t } = useTranslations();
const {
    settings: desktopSettings,
    initDesktopSettings,
    updateDesktopSetting,
} = useDesktopSettings();

const isDlcPanelOpened = ref(false);
const isLanguagePanelOpened = ref(false);

const isMetric = computed(() => activeSettings.value.units === "metric");
const rpcEnabled = computed(() => desktopSettings.value.rpcEnabled);
const selectedExpansion = computed(() => {
    return settings.value.selectedGame === "ets2"
        ? ets2Expansions
        : atsExpansions;
});

const languageItems = computed(() => [
    {
        label: t("languages.english"),
        value: "en" as LocaleCode,
        icon: "flag:us-4x3",
    },
    {
        label: t("languages.german"),
        value: "de" as LocaleCode,
        icon: "flag:de-4x3",
    },
    {
        label: t("languages.dutch"),
        value: "nl" as LocaleCode,
        icon: "flag:nl-4x3",
    },
    {
        label: t("languages.czech"),
        value: "cs" as LocaleCode,
        icon: "flag:cz-4x3",
    },
    {
        label: t("languages.slovak"),
        value: "sk" as LocaleCode,
        icon: "flag:sk-4x3",
    },
    {
        label: t("languages.romanian"),
        value: "ro" as LocaleCode,
        icon: "flag:ro-4x3",
    },
    {
        label: t("languages.korean"),
        value: "ko" as LocaleCode,
        icon: "flag:kr-4x3",
    },
]);

const currentLanguageLabel = computed(() => {
    const foundLanguage = languageItems.value.find((item) => {
        return item.value === locale.value;
    });

    return foundLanguage ? foundLanguage.label : t("languages.english");
});

function toggleUnits() {
    updateProfile("units", isMetric.value ? "imperial" : "metric");
}

function toggleDlcPanel() {
    isDlcPanelOpened.value = !isDlcPanelOpened.value;
}

function toggleLanguagePanel() {
    isLanguagePanelOpened.value = !isLanguagePanelOpened.value;
}

onMounted(async () => {
    if ((window as any).electronAPI) {
        await initDesktopSettings();
    }
});
</script>

<template>
    <div>
        <div class="menu-list">
            <div class="category-wrapper">
                <p class="category-title small">
                    {{ t("settings.regionalGame") }}
                </p>

                <div class="items-wrapper-stacked">
                    <div
                        v-if="activeSettings.activeMod === 'none'"
                        class="option setting stacked"
                        @click.prevent="toggleDlcPanel"
                    >
                        <div class="option-title">
                            <div class="icon-wrapper">
                                <Icon name="lucide:map-plus" class="icon" />
                            </div>

                            <p>{{ t("settings.ownedDlcs") }}</p>
                        </div>

                        <div class="option-action">
                            <div class="owned-dlcs">
                                <span class="setting-button-text">
                                    {{ activeSettings.ownedDlcs.length }} /
                                    {{ Object.keys(selectedExpansion).length }}
                                </span>
                            </div>

                            <Icon
                                name="lucide:chevron-right"
                                class="chevron translate-y"
                            />
                        </div>
                    </div>

                    <div class="small-separator"></div>

                    <div class="option setting stacked" @click="toggleUnits">
                        <div class="option-title">
                            <div class="icon-wrapper">
                                <Icon name="lucide:ruler" class="icon" />
                            </div>

                            <p>{{ t("settings.units") }}</p>
                        </div>

                        <SegmentedControl
                            :left-option="t('settings.metric')"
                            :right-option="t('settings.imperial')"
                            size="normal"
                            :active="isMetric"
                        />
                    </div>

                    <div class="small-separator"></div>

                    <div
                        @click.self="toggleLanguagePanel"
                        class="option setting stacked"
                    >
                        <div
                            @click.stop="toggleLanguagePanel"
                            class="option-title"
                        >
                            <div class="icon-wrapper">
                                <Icon name="lucide:languages" class="icon" />
                            </div>

                            <p>{{ t("settings.language") }}</p>
                        </div>

                        <div
                            @click.stop="toggleLanguagePanel"
                            class="option-action"
                        >
                            <div class="owned-dlcs">
                                <span class="setting-button-text">
                                    {{ currentLanguageLabel }}
                                </span>
                            </div>

                            <Icon
                                name="lucide:chevron-right"
                                class="chevron translate-y"
                            />
                        </div>

                        <PopupPanel
                            v-if="isLanguagePanelOpened"
                            @close="toggleLanguagePanel"
                        >
                            <template #category-title>Language</template>
                            <template #category-description
                                >Choose your preferred language</template
                            >

                            <div class="languages">
                                <div
                                    v-for="language in languageItems"
                                    class="language"
                                    :class="{
                                        active:
                                            language.label ===
                                            currentLanguageLabel,
                                    }"
                                    @click="setLocale(language.value)"
                                >
                                    <div class="flag">
                                        <Icon
                                            :name="language.icon"
                                            class="flag-icon"
                                            :class="{
                                                active:
                                                    language.label ===
                                                    currentLanguageLabel,
                                            }"
                                            size="30"
                                        />
                                    </div>

                                    <p>{{ language.label }}</p>
                                </div>
                            </div>
                        </PopupPanel>
                    </div>
                </div>
            </div>

            <div class="category-wrapper">
                <p class="category-title small">{{ t("settings.system") }}</p>

                <div class="items-wrapper-stacked">
                    <div
                        class="option setting stacked"
                        @click="updateDesktopSetting('rpcEnabled', !rpcEnabled)"
                    >
                        <div class="option-title">
                            <div class="icon-wrapper">
                                <Icon name="fa6-brands:discord" class="icon" />
                            </div>

                            <p>{{ t("desktop.discordRpc") }}</p>
                        </div>

                        <Switch v-model="rpcEnabled" />
                    </div>

                    <div class="small-separator"></div>

                    <div class="option setting stacked">
                        <div class="option-title">
                            <div class="icon-wrapper">
                                <Icon name="lucide:rotate-ccw" class="icon" />
                            </div>

                            <p>{{ t("settings.resetToDefaults") }}</p>
                        </div>

                        <button
                            @click.prevent="resetSettings"
                            class="nav-btn dark settings-btn"
                        >
                            {{ t("common.reset") }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <PopupPanel v-if="isDlcPanelOpened" @close="toggleDlcPanel">
            <template #icon
                ><Icon name="lucide:map-plus" class="icon"
            /></template>

            <template #category-title>Map Expansions</template>
            <template #category-description
                >Select the map DLCs you own</template
            >

            <ManageDlcsWindow />
        </PopupPanel>
    </div>
</template>
