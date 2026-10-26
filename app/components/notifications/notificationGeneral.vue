<script lang="ts" setup>
const props = defineProps<{
    text: string;
    trigger: number;
}>();

const { isWeb } = usePlatform();
const isVisible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

watch(
    () => props.trigger,
    (newVal) => {
        if (newVal > 0) {
            isVisible.value = true;

            if (timer) clearTimeout(timer);

            timer = setTimeout(() => {
                isVisible.value = false;
            }, 2000);
        }
    },
);
</script>

<template>
    <div class="notification-container" :class="{ 'is-web': isWeb }">
        <div v-if="isVisible" class="notification-wrapper">
            <div class="content-wrapper">
                <span>{{ text }}</span>
                <slot name="icon"></slot>
            </div>
        </div>
    </div>
</template>

<style
    scoped
    lang="scss"
    src="~/assets/scss/scoped/notifications/notificationRoute.scss"
></style>
