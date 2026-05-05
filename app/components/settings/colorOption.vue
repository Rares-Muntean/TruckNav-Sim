<script lang="ts" setup>
const { activeSettings, updateProfile, resetProfileSetting } = useSettings();
const { t } = useTranslations();
type colorKeys = keyof GameProfile & `${string}Color`;

const props = defineProps<{
    optionTitle: string;
    colorElement: colorKeys;
}>();

/**
 *
 */
const currentColor = computed({
    get() {
        return activeSettings.value[props.colorElement];
    },

    set(newColor: string) {
        updateProfile(props.colorElement, newColor);
    },
});

function resetColor() {
    resetProfileSetting(props.colorElement);
}
</script>

<template>
    <div class="option setting">
        <div class="option-title">
            <slot name="icon"></slot>
            <p>{{ optionTitle }}</p>
        </div>
        <div class="color-options">
            <UPopover>
                <UButton
                    class="change-color-btn nav-btn settings-btn"
                    :style="{ backgroundColor: currentColor }"
                >
                    <template #leading>
                        <span
                            :style="{ backgroundColor: currentColor }"
                            class="color-preview"
                        />
                    </template>
                </UButton>

                <template #content>
                    <UColorPicker
                        :throttle="200"
                        size="xl"
                        v-model="currentColor"
                        class="color-picker"
                    />
                    <div class="picker-footer">
                        <button
                            @click.prevent="resetColor"
                            class="settings-btn default-color small-reset"
                            title="Reset to default"
                        >
                            <Icon name="lucide:refresh-ccw" size="18" />
                            <span>{{ t("common.reset") }}</span>
                        </button>
                    </div>
                </template>
            </UPopover>
        </div>
    </div>
</template>
