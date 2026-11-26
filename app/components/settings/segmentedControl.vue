<script lang="ts" setup generic="T extends string | number | boolean">
export interface SegmentOption<T> {
    label: string;
    value: T;
}

const props = defineProps<{
    options: SegmentOption<T>[];
    size: "small" | "normal";
    modelValue: T;
}>();

const emit = defineEmits<{ "update:modelValue": [value: T] }>();
</script>

<template>
    <div class="segmented-control" :class="[size]" @click.stop>
        <button
            v-for="option in options"
            :key="String(option.value)"
            type="button"
            class="segment-btn"
            :class="{ active: modelValue === option.value }"
            @click="emit('update:modelValue', option.value)"
        >
            <span class="label">{{ option.label }}</span>
        </button>
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/segmentedControl.scss"
></style>
