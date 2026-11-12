<script lang="ts" setup>
const model = defineModel<"drive" | "trip" | "settings">();

const emit = defineEmits(["tabClicked"]);

function handleTabClick(tab: "drive" | "trip" | "settings") {
    emit("tabClicked", tab);
    model.value = tab;
}

const { t } = useTranslations();
</script>

<template>
    <div class="tabs-container safe-padding-left safe-padding-right">
        <div
            class="tab-item"
            :class="{ 'is-active': model === 'drive' }"
            @click="handleTabClick('drive')"
        >
            <Icon name="lucide:map" class="icon" />
            <span class="tab-title">{{ t("common.drive") }}</span>
        </div>

        <div
            class="tab-item"
            :class="{ 'is-active': model === 'trip' }"
            @click="handleTabClick('trip')"
        >
            <Icon name="lucide:gauge" class="icon" />
            <span class="tab-title">{{ t("common.trip") }}</span>
        </div>

        <div
            class="tab-item"
            :class="{ 'is-active': model === 'settings' }"
            @click="handleTabClick('settings')"
        >
            <Icon name="lucide:settings-2" class="icon" />
            <span class="tab-title">{{ t("settings.title") }}</span>
        </div>
    </div>
</template>

<style scoped src="~/assets/scss/scoped/common/bottomPillTabs.scss"></style>
