<script lang="ts" setup>
const { activeSettings, updateProfile } = useSettings();
type colorKeys = keyof GameProfile & `${string}Color`;

const props = defineProps<{
    optionTitle: string;
    iconName: string;
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
</script>

<template>
    <div class="option setting">
        <div class="option-title">
            <Icon :name="iconName" size="24" />
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
                </template>
            </UPopover>
        </div>
    </div>
</template>
