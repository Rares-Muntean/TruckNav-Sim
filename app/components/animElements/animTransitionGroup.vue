<script lang="ts" setup>
import { anim } from "~/assets/utils/animations/anim";

const props = withDefaults(
    defineProps<{
        type?: "turnCard" | "pop" | "fade";
        name?: string;
        tag?: string;
    }>(),
    {
        type: "turnCard",
        name: "anim-group",
        tag: "div",
    },
);

const beforeLeaveHook = (el: Element) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.top = `${htmlEl.offsetTop}px`;
    htmlEl.style.left = `${htmlEl.offsetLeft}px`;
    htmlEl.style.width = `${htmlEl.offsetWidth}px`;
};

const enterHook = (el: Element, done?: () => void) => {
    switch (props.type) {
        case "turnCard":
            return anim.turnCardEnter(el, done);
        case "pop":
            return anim.popEnter(el, done);
        case "fade":
            return anim.fadeEnter(el, done);
    }
};

const leaveHook = (el: Element, done?: () => void) => {
    switch (props.type) {
        case "turnCard":
            return anim.turnCardLeave(el, done);
        case "pop":
            return anim.popLeave(el, done);
        case "fade":
            return anim.fadeLeave(el, done);
    }
};
</script>

<template>
    <TransitionGroup
        :name="name"
        :tag="tag"
        @before-leave="beforeLeaveHook"
        @enter="enterHook"
        @leave="leaveHook"
    >
        <slot />
    </TransitionGroup>
</template>

<style lang="scss">
.anim-group-move {
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.anim-group-leave-active {
    position: absolute !important;
}
</style>
