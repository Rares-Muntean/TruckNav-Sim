<script lang="ts" setup>
import { AppSettings } from "~~/shared/constants/appSettings";

defineProps<{ closePanel: () => void }>();

const themeColors = ["#7c3aed", "#FFD700", "#22d3ee", "#60a5fa"];

const currentColor = ref(AppSettings.theme.defaultColor);

const changeTheme = (color: string) => {
    currentColor.value = color;
    AppSettings.theme.defaultColor = color;
    document.documentElement.style.setProperty("--theme-color", color);
    localStorage.setItem("truck-nav-theme", color);
};

onMounted(() => {
    const savedColor = localStorage.getItem("truck-nav-theme");
    if (savedColor) {
        changeTheme(savedColor);
    }
});
</script>

<template>
    <div class="settings-panel">
        <div class="settings-title setting">
            <!-- <HudButton
                class="return-button"
                icon-name="material-symbols:arrow-back-rounded"
                :onClick="closePanel"
            /> -->
            <div class="icon-btn" v-on:click="closePanel">
                <Icon name="material-symbols:arrow-back-rounded" size="26" />
            </div>

            <div class="title-icon">
                <Icon name="flowbite:cog-outline" size="38" />

                <div>
                    <h2>Settings</h2>
                    <p class="panel-description">
                        App preferences and customization
                    </p>
                </div>
            </div>
        </div>

        <div class="separator"></div>

        <div class="theme setting">
            <div class="setting-title">
                <Icon name="solar:pallete-2-linear" size="24" />
                <p>Theme</p>
            </div>
            <div
                class="color-options"
                :style="{ '--theme-color': AppSettings.theme.defaultColor }"
            >
                <div
                    v-for="color in themeColors"
                    :key="color"
                    class="color-box"
                    :class="{ active: currentColor === color }"
                    :style="{ backgroundColor: color }"
                    @click="changeTheme(color)"
                ></div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" src="~/assets/scss/scoped/settingsPanel.scss"></style>
