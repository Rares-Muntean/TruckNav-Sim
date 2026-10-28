<script lang="ts" setup>
import { animate } from "motion";

const isActive = defineModel({ default: false });

const switchRef = ref<HTMLElement | null>(null);
</script>

<template>
    <div class="switch">
        <div class="circle"></div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/buttons/switch.scss"
></style>
