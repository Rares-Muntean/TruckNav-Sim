<script lang="ts" setup>
import { anim } from "~/assets/utils/animations/anim";

const props = withDefaults(
    defineProps<{
        type?:
            | "fade"
            | "pop"
            | "view"
            | "ticker"
            | "turnCard"
            | "page"
            | "panel";
        mode?: "out-in" | "default" | "in-out";
    }>(),
    {
        type: "fade",
        mode: "out-in",
    },
);

const enterHook = (el: Element, done?: () => void) => {
    switch (props.type) {
        case "fade":
            return anim.fadeEnter(el, done);
        case "pop":
            return anim.popEnter(el, done);
        case "view":
            return anim.viewEnter(el, done);
        case "ticker":
            return anim.tickerEnter(el, done);
        case "turnCard":
            return anim.turnCardEnter(el, done);
        case "page":
            return anim.pageEnter(el, done);
        case "panel":
            return anim.panelEnter(el, done);
    }
};

const leaveHook = (el: Element, done?: () => void) => {
    switch (props.type) {
        case "fade":
            return anim.fadeLeave(el, done);
        case "pop":
            return anim.popLeave(el, done);
        case "view":
            return anim.viewLeave(el, done);
        case "ticker":
            return anim.tickerLeave(el, done);
        case "turnCard":
            return anim.turnCardLeave(el, done);
        case "page":
            return anim.fadeLeave(el, done);
        case "panel":
            return anim.panelLeave(el, done);
    }
};
</script>

<template>
    <Transition :mode="mode" :css="false" @enter="enterHook" @leave="leaveHook">
        <slot />
    </Transition>
</template>

<style></style>
