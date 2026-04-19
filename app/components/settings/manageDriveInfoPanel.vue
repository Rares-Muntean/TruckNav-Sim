<script lang="ts" setup>
const { settings, updateGlobal } = useSettings();

interface Component {
    id: UiComponent;
    title: string;
    description: string;
    iconName: string;
}

const components: Component[] = [
    {
        id: "speed",
        title: "Speed",
        description:
            "Displays your current driving speed in your preferred unit.",
        iconName: "lucide:gauge",
    },

    {
        id: "fuel",
        title: "Fuel",
        description:
            "Shows your remaining fuel level and it pulses when running low.",
        iconName: "lucide:fuel",
    },

    {
        id: "sleep",
        title: "Sleep Time",
        description:
            "Displays the time remaining until your next mandatory rest stop.",
        iconName: "lucide:bed-double",
    },

    {
        id: "time",
        title: "Game Time",
        description: "Shows the current in-game time.",
        iconName: "lucide:clock",
    },

    {
        id: "speedLimit",
        title: "Speed Sign",
        description:
            "Displays the legal speed limit for the road you are currently on.",
        iconName: "lucide:octagon-alert",
    },

    {
        id: "topBar",
        title: "Top Bar",
        description: "Hides the whole top bar with drive info.",
        iconName: "lucide:info",
    },
];

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
