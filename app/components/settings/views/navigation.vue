<script lang="ts" setup>
import SegmentedControl from "../segmentedControl.vue";

const { settings, activeSettings, updateGlobal, updateProfile } = useSettings();
const { t } = useTranslations();

const hasGuidedNavigation = computed(
    () => activeSettings.value.hasTurnNavigation === true,
);
const usesGameTime = computed(() => settings.value.routeTimeMode === "game");

function toggleGuidedNavigation() {
    updateProfile(
        "hasTurnNavigation",
        hasGuidedNavigation.value ? false : true,
    );
}

function toggleRouteTimeMode() {
    updateGlobal("routeTimeMode", usesGameTime.value ? "real" : "game");
}
</script>

<template>
    <div>
        <div class="menu-list">
            <div class="category-wrapper">
                <p class="category-title">{{ t("settings.guidanceTime") }}</p>

                <div class="items-wrapper-stacked">
                    <div
                        class="option setting stacked"
                        @click="toggleGuidedNavigation"
                    >
                        <div class="option-title">
                            <Icon name="lucide:navigation-2" class="icon" />
                            <p>{{ t("settings.guidedNavigation") }}</p>
                        </div>

                        <SegmentedControl
                            :left-option="t('settings.on')"
                            :right-option="t('settings.off')"
                            size="normal"
                            :active="hasGuidedNavigation"
                        />
                    </div>

                    <div
                        class="option setting stacked"
                        @click="toggleRouteTimeMode"
                    >
                        <div class="option-title">
                            <Icon name="lucide:clock-3" class="icon" />
                            <p>{{ t("settings.estimatedTime") }}</p>
                        </div>

                        <SegmentedControl
                            :left-option="t('settings.gameTime')"
                            :right-option="t('settings.realTime')"
                            size="normal"
                            :active="usesGameTime"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
