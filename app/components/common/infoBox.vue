<script lang="ts" setup>
const props = withDefaults(
    defineProps<{
        position?: "left" | "center" | "right";
    }>(),
    {
        position: "right",
    },
);

const popupOpened = ref(false);
</script>

<template>
    <div class="info-box">
        <button
            type="button"
            class="icon-wrapper"
            @blur="popupOpened = false"
            @click="popupOpened = !popupOpened"
        >
            <Icon name="lucide:info" class="icon" />

            <div v-if="popupOpened" class="popup" :class="position">
                <slot name="content"></slot>
            </div>
        </button>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/infoBox.scss"
></style>
