<script lang="ts" setup>
defineProps<{
    onClick: () => void;
    isActive?: boolean;
}>();
</script>

<template>
    <button class="option-btn" @click.prevent="onClick">
        <slot />
    </button>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/hudButton.scss"
></style>
