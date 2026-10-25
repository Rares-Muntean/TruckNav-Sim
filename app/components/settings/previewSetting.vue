<script lang="ts" setup>
const props = withDefaults(
    defineProps<{ height: number; hasBoxShadow?: boolean }>(),
    { hasBoxShadow: true },
);
</script>

<template>
    <div
        class="preview"
        :class="{ shadow: hasBoxShadow }"
        :style="{
            'min-height': `${height}px`,
        }"
    >
        <slot />
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/previewSetting.scss"
></style>
