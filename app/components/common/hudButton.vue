<script lang="ts" setup>
defineProps<{
    onClick: () => void;
    iconName: string;
    activeIconName?: string;
    isActive?: boolean;
}>();
</script>

<template>
    <button class="option-btn" @click.prevent="onClick">
        <Icon v-if="!activeIconName" :name="iconName" size="28" />

        <template v-else>
            <Icon v-show="isActive" :name="activeIconName" size="28" />
            <Icon v-show="!isActive" :name="iconName" size="28" />
        </template>
    </button>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/hudButton.scss"
></style>
