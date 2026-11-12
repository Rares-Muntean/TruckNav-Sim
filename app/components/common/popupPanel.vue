<script lang="ts" setup>
const emit = defineEmits(["close"]);
const { t } = useTranslations();
</script>

<template>
    <div class="popup-overlay">
        <div class="section popup-window safe-padding-left safe-padding-right">
            <div class="title-wrapper">
                <div class="section-title">
                    <button
                        class="nav-btn icon-close primary-color"
                        @click="emit('close')"
                        v-press
                    >
                        <Icon name="lucide:arrow-left" size="19" />
                    </button>

                    <div class="category-header">
                        <div class="category-title w-description">
                            <slot name="category-title">{{
                                t("placeholder.title")
                            }}</slot>
                        </div>

                        <div class="category-description">
                            <slot name="category-description">{{
                                t("placeholder.description")
                            }}</slot>
                        </div>
                    </div>
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
