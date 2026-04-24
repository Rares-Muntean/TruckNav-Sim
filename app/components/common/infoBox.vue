<script lang="ts" setup>
import { capitalize } from "vue";

const props = defineProps<{
    type: "note" | "warning" | "caution";
}>();
</script>

<template>
    <div class="info-box">
        <div class="title">
            <Icon name="lucide:info" class="icon" />
            <p>{{ capitalize(type) }}</p>
        </div>

        <slot name="content"></slot>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/infoBox.scss"
></style>
