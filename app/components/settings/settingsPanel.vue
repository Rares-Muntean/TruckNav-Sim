<script lang="ts" setup>
import { App } from "@capacitor/app";

type settingsView = "main" | "general" | "appearance" | "navigation";

const { t } = useTranslations();

const emit = defineEmits(["goHome", "goMapView"]);

const currentView = ref<settingsView>("main");

function setView(view: settingsView) {
    currentView.value = view;
}

const settingsTitle = computed(() => {
    if (currentView.value === "main") return t("settings.title");
    else if (currentView.value === "navigation")
        return t("settings.navigation");
    else if (currentView.value === "appearance")
        return t("settings.appearance");
    else if (currentView.value === "general") return t("settings.general");
});

const settingsDescription = computed(() => {
    if (currentView.value === "main") return t("settings.description");
    else if (currentView.value === "navigation") return t("settings.timeHud");
    else if (currentView.value === "appearance")
        return t("settings.themesMapStyling");
    else if (currentView.value === "general")
        return t("settings.preferencesSystem");
});

function handleBack() {
    if (currentView.value === "main") {
        emit("goMapView");
    }

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
        <div class="section-title wrapper">
            <div class="title-text">
                <button
                    class="nav-btn primary-color icon-close"
                    @click="handleBack"
                >
                    <Icon name="lucide:arrow-left" size="17" />
                </button>

                <div class="category">
                    <div class="category-title w-description">
                        <slot name="category-title">{{ settingsTitle }}</slot>
                    </div>

                    <div class="category-description">
                        <slot name="category-description">{{
                            settingsDescription
                        }}</slot>
                    </div>
                </div>
            </div>
        </div>

        <div class="settings-panel-content">
            <div v-if="currentView === 'main'" class="main-content" key="main">
                <div class="menu-list">
                    <div class="category-wrapper">
                        <p class="category-title small">
                            {{ t("preferences") }}
                        </p>

                        <div class="items-wrapper-stacked">
                            <div
                                class="option stacked main-setting"
                                @click="setView('general')"
                            >
                                <div class="option-text">
                                    <div class="icon-wrapper">
                                        <Icon
                                            name="lucide:settings-2"
                                            class="icon"
                                        />
                                    </div>

                                    <div class="option-text-wrapper">
                                        <span>{{ t("settings.general") }}</span>

                                        <p class="option-description">
                                            {{
                                                t("settings.preferencesSystem")
                                            }}
                                        </p>
                                    </div>
                                </div>

                                <Icon
                                    name="lucide:chevron-right"
                                    class="icon chevron"
                                />
                            </div>

                            <div class="small-separator"></div>

                            <div
                                class="option stacked main-setting"
                                @click="setView('appearance')"
                            >
                                <div class="option-text">
                                    <div class="icon-wrapper">
                                        <Icon
                                            name="lucide:palette"
                                            class="icon"
                                        />
                                    </div>

                                    <div class="option-text-wrapper">
                                        <span>{{
                                            t("settings.appearance")
                                        }}</span>
                                        <p class="option-description">
                                            {{ t("settings.themesMapStyling") }}
                                        </p>
                                    </div>
                                </div>

                                <Icon
                                    name="lucide:chevron-right"
                                    class="icon chevron"
                                />
                            </div>

                            <div class="small-separator"></div>

                            <div
                                class="option stacked main-setting"
                                @click="setView('navigation')"
                            >
                                <div class="option-text">
                                    <div class="icon-wrapper">
                                        <Icon
                                            name="lucide:navigation"
                                            class="icon"
                                        />
                                    </div>

                                    <div class="option-text-wrapper">
                                        <span>{{
                                            t("settings.navigation")
                                        }}</span>
                                        <p class="option-description">
                                            {{ t("settings.timeHud") }}
                                        </p>
                                    </div>
                                </div>

                                <Icon
                                    name="lucide:chevron-right"
                                    class="icon chevron"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="category-wrapper">
                        <p class="category-title small">{{ t("session") }}</p>

                        <div class="items-wrapper">
                            <div class="option" @click="emit('goHome')">
                                <div class="option-text">
                                    <div class="icon-wrapper">
                                        <Icon
                                            name="lucide:door-open"
                                            class="icon"
                                        />
                                    </div>

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

            <General v-else-if="currentView === 'general'" key="general" />

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
