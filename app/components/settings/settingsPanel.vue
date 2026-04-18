<script lang="ts" setup>
type settingsView = "main" | "general" | "appearance" | "navigation";

const props = defineProps<{ closePanel: () => void }>();

const currentView = ref<settingsView>("main");

function setView(view: settingsView) {
    currentView.value = view;
}

function handleBack() {
    if (currentView.value === "main") {
        props.closePanel();
    } else {
        currentView.value = "main";
    }
}
</script>

<template>
    <div class="settings-panel">
        <div class="settings-title">
            <div class="icon-btn" v-on:click="handleBack">
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

        <div class="settings-wrapper">
            <Transition name="page-fade" mode="out-in">
                <div
                    v-if="currentView === 'main'"
                    class="menu-list main"
                    key="main"
                >
                    <div class="option setting" @click="setView('general')">
                        <Icon name="lucide:settings-2" size="28" />
                        <span>General</span>
                        <Icon
                            name="lucide:chevron-right"
                            size="24"
                            class="arrow"
                        />
                    </div>

                    <div class="option setting" @click="setView('appearance')">
                        <Icon name="lucide:palette" size="28" />
                        <span>Appearance</span>
                        <Icon
                            name="lucide:chevron-right"
                            size="24"
                            class="arrow"
                        />
                    </div>

                    <div class="option setting" @click="setView('navigation')">
                        <Icon name="lucide:navigation" size="28" />
                        <span>Navigation</span>
                        <Icon
                            name="lucide:chevron-right"
                            size="24"
                            class="arrow"
                        />
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
            </Transition>
        </div>
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/settingsPanel.scss"
></style>
