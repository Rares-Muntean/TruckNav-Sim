<script lang="ts" setup>
import { anim } from "~/assets/utils/animations/anim";

const SWITCH_DISTANCE = 5 - 2 - 0.4; // switch width - circle width - switch padding x 2

const props = defineProps<{
    isActive: boolean;
}>();

const switchRef = ref<HTMLElement | null>(null);

onMounted(() => {
    if (props.isActive && switchRef.value) {
        anim.switchRight(switchRef.value, SWITCH_DISTANCE);
    }
});

watch(
    () => props.isActive,
    (newV) => {
        if (switchRef.value) {
            if (newV) {
                anim.switchRight(switchRef.value, SWITCH_DISTANCE);
            } else {
                anim.switchLeft(switchRef.value);
            }
        }
    },
);
</script>

<template>
    <div class="switch" :class="{ 'is-active': props.isActive }">
        <div ref="switchRef" class="circle"></div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/buttons/switch.scss"
></style>
