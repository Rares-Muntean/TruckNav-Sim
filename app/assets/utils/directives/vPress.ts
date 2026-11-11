import { animate } from "motion";
import type { Directive } from "vue";
import { EASE } from "~/types/easings";
import { anim } from "../animations/anim";

export const vPress: Directive = {
    mounted(el: HTMLElement) {
        const getDynamicScale = () => {
            const width = el.offsetWidth || 100;

            if (width <= 50) return 0.93;
            if (width <= 120) return 0.95;
            if (width <= 250) return 0.97;
            return 0.985;
        };

        const pressDown = () => {
            const targetScale = getDynamicScale();
            anim.pressDown(el, targetScale);
        };

        const release = () => {
            anim.pressRelease(el);
        };

        el.addEventListener("pointerdown", pressDown);

        el.addEventListener("pointerup", release);
        el.addEventListener("pointerleave", release);
        el.addEventListener("pointercancel", release);

        (el as any)._pressCleanup = () => {
            el.removeEventListener("pointerdown", pressDown);
            el.removeEventListener("pointerup", release);
            el.removeEventListener("pointerleave", release);
            el.removeEventListener("pointercancel", release);
        };
    },

    unmounted(el: HTMLElement) {
        (el as any)._pressCleanup?.();
    },
};
