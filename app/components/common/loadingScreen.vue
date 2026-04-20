<script lang="ts" setup>
import { darkenColor } from "~/assets/utils/shared/colors";

defineProps<{ progress: number }>();
const { activeSettings } = useSettings();
const { t } = useTranslations();
</script>

<template>
    <div class="loading-screen">
        <div
            class="progress-text"
            :style="{
                color: darkenColor(activeSettings.themeColor, 0.2),
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
                        activeSettings.themeColor,
                        0.2,
                    ),
                }"
            ></div>
        </div>
        <h2 class="loading-text">{{ t("common.loadingRouteData") }}</h2>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/loadingScreen.scss"
></style>
