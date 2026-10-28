<script lang="ts" setup>
const emit = defineEmits(["close"]);
</script>

<template>
    <div class="popup-overlay">
        <div class="backdrop" @click="emit('close')"></div>

        <div class="section popup-window">
            <div class="title-wrapper">
                <div class="section-title">
                    <button
                        class="nav-btn icon-close primary-color"
                        @click="emit('close')"
                    >
                        <Icon name="lucide:arrow-left" size="17" />
                    </button>

                    <slot name="title"></slot>
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
