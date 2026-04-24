<script lang="ts" setup>
const props = defineProps<{
    active: boolean;
    size: "small" | "normal";
    leftOption: string;
    rightOption: string;
    isSameColor?: boolean;
}>();
const emit = defineEmits(["connect"]);
</script>

<template>
    <div class="segmented-control" @click="emit('connect')" :class="[size]">
        <button class="segment-btn" :class="[{ active: active }]">
            <span class="label">{{ leftOption }}</span>
        </button>

        <button
            class="segment-btn"
            :class="[
                {
                    active: !active && isSameColor,
                    activeOff: !active && !isSameColor,
                },
            ]"
        >
            <span class="label">{{ rightOption }}</span>
        </button>
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/segmentedControl.scss"
></style>
