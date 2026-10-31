<script lang="ts" setup>
const { settings, updateGlobal } = useSettings();
const { t } = useTranslations();

interface Component {
    id: UiComponent;
    title: string;
    description: string;
    iconName: string;
}

const components = computed<Component[]>(() => [
    {
        id: "speed",
        title: t("uiComponents.speedTitle"),
        description: t("uiComponents.speedDescription"),
        iconName: "lucide:gauge",
    },
    {
        id: "speedLimit",
        title: t("uiComponents.speedLimitTitle"),
        description: t("uiComponents.speedLimitDescription"),
        iconName: "lucide:octagon-alert",
    },
    {
        id: "fuel",
        title: t("uiComponents.fuelTitle"),
        description: t("uiComponents.fuelDescription"),
        iconName: "lucide:fuel",
    },
]);

function toggleUiComponent(componentId: UiComponent) {
    const currentList = [...settings.value.activeUiComponents];
    const index = currentList.indexOf(componentId);

    if (index > -1) {
        currentList.splice(index, 1);
    } else {
        currentList.push(componentId);
    }

    updateGlobal("activeUiComponents", currentList);
}
</script>

<template>
    <div class="manage-drive-info-wrapper">
        <div
            class="component"
            v-for="component in components"
            :key="component.id"
            @click="toggleUiComponent(component.id)"
            :class="{
                'is-active': settings.activeUiComponents.includes(component.id),
            }"
        >
            <div class="info">
                <div class="title">
                    <Icon class="icon" :name="component.iconName" />
                    <p>{{ component.title }}</p>
                </div>
                <div class="description">{{ component.description }}</div>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/settings/manageDriveInfoPanel.scss"
></style>
