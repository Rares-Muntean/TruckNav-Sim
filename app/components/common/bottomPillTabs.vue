<script lang="ts" setup>
const model = defineModel<"drive" | "trip" | "settings">();
</script>

<template>
    <div class="tabs-container">
        <div
            class="tab-item"
            :class="{ 'is-active': model === 'drive' }"
            @click="model = 'drive'"
        >
            <Icon name="lucide:map" class="icon" />
            <span class="tab-title">Drive</span>
        </div>

        <div
            class="tab-item"
            :class="{ 'is-active': model === 'trip' }"
            @click="model = 'trip'"
        >
            <Icon name="lucide:gauge" class="icon" />
            <span class="tab-title">Trip</span>
        </div>

        <div
            class="tab-item"
            :class="{ 'is-active': model === 'settings' }"
            @click="model = 'settings'"
        >
            <Icon name="lucide:settings-2" class="icon" />
            <span class="tab-title">Settings</span>
        </div>
    </div>
</template>

<style scoped src="~/assets/scss/scoped/common/bottomPillTabs.scss"></style>
