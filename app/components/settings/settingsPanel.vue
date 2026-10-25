<script lang="ts" setup>
import { App } from "@capacitor/app";

type settingsView = "main" | "general" | "appearance" | "navigation";

const { t } = useTranslations();

const currentView = ref<settingsView>("main");

function setView(view: settingsView) {
    currentView.value = view;
}

function handleBack() {
    currentView.value = "main";
}

const appVersion = ref("0.5.2");

onMounted(async () => {
    try {
        const info = await App.getInfo();
        if (info?.version) {
            appVersion.value = info.version;
        }
    } catch {}
});
</script>

<template>
    <div class="section settings-panel">
        <div class="section-title">
            <Icon name="lucide:settings" class="icon" />
            <p>{{ t("settings.title") }}</p>
        </div>

        <div class="separator"></div>

        <div class="settings-panel-content">
            <div v-if="currentView === 'main'" class="main-content" key="main">
                <div class="menu-list">
                    <div class="category-wrapper">
                        <p class="category-title">{{ t("preferences") }}</p>

                        <div class="items-wrapper">
                            <div class="option" @click="setView('general')">
                                <div class="option-text">
                                    <Icon
                                        name="lucide:settings-2"
                                        class="icon"
                                    />

                                    <div class="option-text-wrapper">
                                        <span>{{ t("settings.general") }}</span>

                                        <p class="option-description">
                                            {{ t("settings.languageUnits") }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div class="option" @click="setView('appearance')">
                                <div class="option-text">
                                    <Icon name="lucide:palette" class="icon" />

                                    <div class="option-text-wrapper">
                                        <span>{{
                                            t("settings.appearance")
                                        }}</span>
                                        <p class="option-description">
                                            {{ t("settings.themesMapStyling") }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div class="option" @click="setView('navigation')">
                                <div class="option-text">
                                    <Icon
                                        name="lucide:navigation"
                                        class="icon"
                                    />

                                    <div class="option-text-wrapper">
                                        <span>{{
                                            t("settings.navigation")
                                        }}</span>
                                        <p class="option-description">
                                            {{ t("settings.timeHud") }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="category-wrapper">
                        <p class="category-title">{{ t("session") }}</p>

                        <div class="items-wrapper">
                            <div class="option" @click="setView('general')">
                                <div class="option-text">
                                    <Icon
                                        name="lucide:door-open"
                                        class="icon"
                                    />

                                    <div class="option-text-wrapper">
                                        <span>{{
                                            t("settings.backToMainMenu")
                                        }}</span>

                                        <p class="option-description">
                                            {{ t("settings.switchGameMaps") }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p>{{ t("common.trucknav") }} {{ appVersion }}</p>
                    <p>{{ t("common.trucknavMoto") }}</p>
                </div>
            </div>

            <General
                v-else-if="currentView === 'general'"
                class="menu-list"
                key="general"
            />

            <Appearance
                v-else-if="currentView === 'appearance'"
                class="menu-list"
                key="appearance"
            />

            <Navigation
                v-else-if="currentView === 'navigation'"
                class="menu-list"
                key="navigation"
            />
        </div>
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/settingsPanel.scss"
></style>
