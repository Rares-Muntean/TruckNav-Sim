<script lang="ts" setup>
import SegmentedControl from "../segmentedControl.vue";

const { activeSettings, updateProfile } = useSettings();

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
                <p>Guided Navigation</p>
            </div>

            <SegmentedControl
                left-option="On"
                right-option="Off"
                @connect="toggleGuidedNavigation"
                size="normal"
                :active="hasGuidedNavigation"
            />
        </div>
    </div>
</template>
