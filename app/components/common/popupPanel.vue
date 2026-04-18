<script lang="ts" setup>
const emit = defineEmits(["close"]);

const props = defineProps<{ title: string }>();
</script>

<template>
    <div class="popup-overlay">
        <div class="backdrop" @click="emit('close')"></div>

        <div class="popup-window">
            <div class="popup-header">
                <h3>{{ title }}</h3>
                <div class="close-icon" @click="emit('close')">
                    <Icon name="lucide:x" size="24" />
                </div>
            </div>

            <div class="popup-content">
                <slot />
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/popupPanel.scss"
></style>
