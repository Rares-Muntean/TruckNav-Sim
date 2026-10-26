<script lang="ts" setup>
const props = defineProps<{
    showIf: boolean;
    resetOn?: boolean;
    text: string;
}>();

const isExpanded = ref(false);

watch(
    () => props.resetOn,
    (newValue) => {
        if (newValue) {
            isExpanded.value = false;
        }
    },
);

const onToggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
};
</script>

<template>
    <div
        v-if="showIf"
        class="compact-trip-progress"
        :class="{ expanded: isExpanded }"
        v-on:click="onToggleExpanded"
    >
        <Icon v-if="isExpanded" name="lucide:chevron-right" size="20" />
        <Icon v-else name="lucide:chevron-left" size="20" />

        <div class="warning-message">
            <Icon name="lucide:triangle-alert" size="20" />

            <div class="text-content">
                <span class="text-nowrap">{{ text }}</span>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/warningSlide.scss"
></style>
