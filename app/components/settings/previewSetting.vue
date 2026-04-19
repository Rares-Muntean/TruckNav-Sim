<script lang="ts" setup>
const props = defineProps<{ height: number }>();
</script>

<template>
    <div class="preview" :style="{ 'min-height': `${height}px` }">
        <slot />
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/previewSetting.scss"
></style>
