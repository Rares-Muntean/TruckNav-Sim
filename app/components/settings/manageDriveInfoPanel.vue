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
        id: "fuel",
        title: t("uiComponents.fuelTitle"),
        description: t("uiComponents.fuelDescription"),
        iconName: "lucide:fuel",
    },

    {
        id: "sleep",
        title: t("uiComponents.sleepTitle"),
        description: t("uiComponents.sleepDescription"),
        iconName: "lucide:bed-double",
    },

    {
        id: "time",
        title: t("uiComponents.gameTimeTitle"),
        description: t("uiComponents.gameTimeDescription"),
        iconName: "lucide:clock",
    },

    {
        id: "speedLimit",
        title: t("uiComponents.speedLimitTitle"),
        description: t("uiComponents.speedLimitDescription"),
        iconName: "lucide:octagon-alert",
    },

    {
        id: "topBar",
        title: t("uiComponents.topBarTitle"),
        description: t("uiComponents.topBarDescription"),
        iconName: "lucide:info",
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

            <div
                class="checkmark"
                :class="{
                    'is-active': settings.activeUiComponents.includes(
                        component.id,
                    ),
                }"
            >
                <Icon
                    v-if="settings.activeUiComponents.includes(component.id)"
                    class="icon"
                    :class="{
                        'is-active': settings.activeUiComponents.includes(
                            component.id,
                        ),
                    }"
                    name="lucide:circle-check"
                />

                <Icon
                    v-else
                    class="icon"
                    :class="{
                        'is-active': settings.activeUiComponents.includes(
                            component.id,
                        ),
                    }"
                    name="lucide:circle"
                />
            </div>
        </div>
    </div>

    <div v-if="false">
        <Icon name="lucide:gauge" />
        <Icon name="lucide:fuel" />
        <Icon name="lucide:bed-double" />
        <Icon name="lucide:clock" />
        <Icon name="lucide:octagon-alert" />
        <Icon name="lucide:info" />
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/settings/manageDriveInfoPanel.scss"
></style>
