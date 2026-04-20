<script lang="ts" setup>
const { activeSettings, updateProfile } = useSettings();
const { t } = useTranslations();

const hasGuidedNavigation = computed(
    () => activeSettings.value.hasTurnNavigation === true,
);

function toggleGuidedNavigation() {
    updateProfile(
        "hasTurnNavigation",
        hasGuidedNavigation.value ? false : true,
    );
}
</script>

<template>
    <div>
        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:navigation-2" size="24" />
                <p>{{ t("settings.guidedNavigation") }}</p>
            </div>

            <div class="segmented-control" @click="toggleGuidedNavigation">
                <button
                    class="segment-btn"
                    :class="{ active: hasGuidedNavigation }"
                >
                    <span class="label">{{ t("settings.on") }}</span>
                </button>

                <button
                    class="segment-btn"
                    :class="{ activeOff: !hasGuidedNavigation }"
                >
                    <span class="label">{{ t("settings.off") }}</span>
                </button>
            </div>
        </div>
    </div>
</template>
