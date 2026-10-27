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

const isMetric = computed(() => activeSettings.value.units === "metric");
const rpcEnabled = computed(() => desktopSettings.value.rpcEnabled);
const selectedExpansion = computed(() => {
    return settings.value.selectedGame === "ets2"
        ? ets2Expansions
        : atsExpansions;
});

const languageItems = computed(() => [
    { label: t("languages.english"), value: "en" as LocaleCode },
    { label: t("languages.german"), value: "de" as LocaleCode },
    { label: t("languages.dutch"), value: "nl" as LocaleCode },
    { label: t("languages.czech"), value: "cs" as LocaleCode },
    { label: t("languages.slovak"), value: "sk" as LocaleCode },
    { label: t("languages.romanian"), value: "ro" as LocaleCode },
    { label: t("languages.korean"), value: "ko" as LocaleCode },
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
                <p class="category-title">{{ t("settings.regionalGame") }}</p>

                <div class="items-wrapper-stacked">
                    <div
                        v-if="activeSettings.activeMod === 'none'"
                        class="option setting stacked"
                        @click.prevent="toggleDlcPanel"
                    >
                        <div class="option-title">
                            <Icon name="lucide:map-plus" class="icon" />
                            <p>{{ t("settings.ownedDlcs") }}</p>
                        </div>

                        <div class="owned-dlcs">
                            <button class="nav-btn settings-btn">
                                {{ activeSettings.ownedDlcs.length }} /
                                {{ Object.keys(selectedExpansion).length }}
                            </button>
                        </div>
                    </div>

                    <div class="option setting stacked" @click="toggleUnits">
                        <div class="option-title">
                            <Icon name="lucide:ruler" class="icon" />
                            <p>{{ t("settings.units") }}</p>
                        </div>

                        <SegmentedControl
                            :left-option="t('settings.metric')"
                            :right-option="t('settings.imperial')"
                            size="normal"
                            :active="isMetric"
                        />
                    </div>

                    <div class="option setting stacked">
                        <div class="option-title">
                            <Icon name="lucide:languages" class="icon" />
                            <p>{{ t("settings.language") }}</p>
                        </div>

                        <USelect
                            :model-value="locale"
                            @update:model-value="(val: any) => setLocale(val)"
                            :items="languageItems"
                            variant="none"
                            class="selector"
                            :ui="{
                                trailingIcon:
                                    'shrink-0 size-[20px] text-white !px-6',
                                content:
                                    'bg-[#333333] shadow-xl rounded-md ring-0 border-0 outline-none',
                                item: 'flex items-center justify-between text-[1.6rem] font-BOLD !py-2 !px-3 text-[#f2f2f2] data-[highlighted]:bg-[#333333] rounded cursor-pointer transition-colors',
                                itemTrailingIcon: 'text-white',
                            }"
                        >
                            <template #default>
                                <span>
                                    {{ currentLanguageLabel }}
                                </span>
                            </template>

                            <template #item="{ item }">
                                <span>
                                    {{ item.label }}
                                </span>
                            </template>
                        </USelect>
                    </div>
                </div>
            </div>

            <div class="category-wrapper">
                <p class="category-title">{{ t("settings.system") }}</p>

                <div class="items-wrapper-stacked">
                    <div
                        class="option setting stacked"
                        @click="updateDesktopSetting('rpcEnabled', !rpcEnabled)"
                    >
                        <div class="option-title">
                            <Icon name="fa6-brands:discord" class="icon" />
                            <p>{{ t("desktop.discordRpc") }}</p>
                        </div>

                        <SegmentedControl
                            :left-option="t('settings.on')"
                            :right-option="t('settings.off')"
                            size="normal"
                            :active="rpcEnabled"
                        />
                    </div>

                    <div class="option setting stacked">
                        <div class="option-title">
                            <Icon name="lucide:rotate-ccw" class="icon" />
                            <p>{{ t("settings.resetToDefaults") }}</p>
                        </div>

                        <button
                            @click.prevent="resetSettings"
                            class="nav-btn settings-btn"
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

            <template #title>Select Expansions</template>

            <ManageDlcsWindow />
        </PopupPanel>
    </div>
</template>
