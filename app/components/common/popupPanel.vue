<script lang="ts" setup>
const emit = defineEmits(["close"]);
</script>

<template>
    <div class="popup-overlay">
        <div class="backdrop" @click="emit('close')"></div>

        <div class="section popup-window">
            <div class="title-wrapper">
                <div class="section-title">
                    <slot name="icon"></slot>
                    <slot name="title"></slot>
                </div>

                <button
                    class="nav-btn icon-close primary-color"
                    @click="emit('close')"
                >
                    <Icon name="lucide:x" size="18" />
                </button>
            </div>

            <div class="separator"></div>

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
