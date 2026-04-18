<script lang="ts" setup>
const props = defineProps<{
    routeDistanceConverted: number;
    distanceUnit: string;
    routeEta: string;
}>();
</script>

<template>
    <div>
        <Icon name="lucide:flag-triangle-right" size="22" />
        <div class="right">
            <span>{{ routeDistanceConverted }} {{ distanceUnit }}, </span>
            <span>{{ routeEta }}</span>
        </div>
        <button class="nav-btn icon-btn">
            <Icon name="lucide:chevron-up" />
        </button>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/compactTrip.scss"
></style>
