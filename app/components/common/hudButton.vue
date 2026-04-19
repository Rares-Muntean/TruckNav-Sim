<script lang="ts" setup>
defineProps<{
    onClick: () => void;
    // iconName: string;
    // activeIconName?: string;
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
