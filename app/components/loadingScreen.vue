<script lang="ts" setup>
import { darkenColor } from "~/assets/utils/colors";
import { AppSettings } from "~~/shared/constants/appSettings";

defineProps<{ progress: number }>();
</script>

<template>
    <div class="loading-screen">
        <div
            class="progress-text"
            :style="{
                color: darkenColor(AppSettings.theme.defaultColor, 0.2),
            }"
        >
            {{ progress }}%
        </div>
        <div class="progress-bar-bg">
            <div
                class="progress-bar-fill"
                :style="{
                    width: progress + '%',
                    backgroundColor: darkenColor(
                        AppSettings.theme.defaultColor,
                        0.2,
                    ),
                }"
            ></div>
        </div>
        <h2>Loading Route Data...</h2>
    </div>
</template>

<style lang="scss" scoped src="~/assets/scss/scoped/loadingScreen.scss"></style>
