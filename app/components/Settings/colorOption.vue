<script lang="ts" setup>
const { settings, updateSettings } = useSettings();
type colorKeys = keyof AppSettingsState & `${string}Color`;

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
        return settings.value[props.colorElement];
    },

    set(newColor: string) {
        updateSettings(props.colorElement, newColor);
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
            <color-picker
                v-model="currentColor"
                v-slot="{ color, show }"
                @change="currentColor = $event.hex"
                :with-colors-history="6"
            >
                <button
                    class="change-color-btn nav-btn settings-btn"
                    @click="show"
                    :style="{ backgroundColor: color.value }"
                ></button>
            </color-picker>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
