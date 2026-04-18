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
        <Icon v-if="!activeIconName" class="icon" :name="iconName" />

        <template v-else>
            <Icon v-show="isActive" class="icon" :name="activeIconName" />
            <Icon v-show="!isActive" class="icon" :name="iconName" />
        </template>
    </button>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/hudButton.scss"
></style>
