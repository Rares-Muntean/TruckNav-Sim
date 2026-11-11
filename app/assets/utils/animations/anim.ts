import { animate, stagger } from "motion";
import { EASE } from "~/types/easings";

export const anim = {
    fadeUp(el: HTMLElement | null, delay = 0) {
        if (!el) return;

        return animate(
            el,
            { opacity: [0, 1], y: [12, 0] },
            { duration: 0.25, ease: EASE.power3Out, delay },
        );
    },

    fadeDown(el: HTMLElement | null, delay = 0) {
        if (!el) return;

        return animate(
            el,
            { opacity: [1, 0], y: [0, 8] },
            { duration: 0.2, ease: EASE.power3In, delay },
        );
    },

    pressDown(el: HTMLElement | null, targetScale: number) {
        if (!el) return;

        return animate(
            el,
            { scale: targetScale },
            {
                duration: 0.1,
                ease: EASE.power2Out,
            },
        );
    },

    pressRelease(el: HTMLElement | null) {
        if (!el) return;

        return animate(
            el,
            { scale: 1 },
            {
                duration: 0.15,
                ease: EASE.backOutSubtle,
            },
        );
    },

    switchLeft(el: HTMLElement | null) {
        if (!el) return;

        return animate(
            el,
            { x: 0 },
            {
                duration: 0.15,
                ease: EASE.backOut,
            },
        );
    },

    switchRight(el: HTMLElement | null, amount: number) {
        if (!el) return;

        return animate(
            el,
            { x: `${amount}rem` },
            {
                duration: 0.15,
                ease: EASE.backOut,
            },
        );
    },

    staggerList(parent: HTMLElement, delayEach = 0.04) {
        if (!parent) return;

        const elements = Array.from(parent.children) as HTMLElement[];

        return animate(
            elements,
            { opacity: [0, 1], y: [12, 0] },
            {
                duration: 0.25,
                delay: stagger(delayEach),
                ease: EASE.power2Out,
            },
        );
    },

    staggerListX(parent: HTMLElement, delayEach = 0.04, startDelay = 0) {
        if (!parent) return;

        const elements = Array.from(parent.children) as HTMLElement[];

        return animate(
            elements,
            { opacity: [0, 1], x: [-10, 0] },
            {
                duration: 0.2,
                delay: stagger(delayEach, { startDelay }),
                ease: EASE.backOut,
            },
        );
    },

    staggerListXReverse(parent: HTMLElement, delayEach = 0.04) {
        if (!parent) return;

        const elements = Array.from(parent.children) as HTMLElement[];

        return animate(
            elements,
            { opacity: [0, 1], x: [10, 0] },
            {
                duration: 0.2,
                delay: stagger(delayEach),
                ease: EASE.power2Out,
            },
        );
    },

    pageEnter(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [0, 1], y: [12, 0] },
            { duration: 0.5, ease: EASE.power3Out },
        );

        if (done) a.finished.then(done);
        return a;
    },

    tickerEnter(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [0, 1], y: [4, 0] },
            { duration: 0.15, ease: EASE.power3Out },
        );

        if (done) a.finished.then(done);
        return a;
    },

    tickerLeave(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [1, 0], y: [0, -4] },
            { duration: 0.1, ease: EASE.power3In },
        );

        if (done) a.finished.then(done);
        return a;
    },

    popEnter(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [0, 1], scale: [0.7, 1] },
            { duration: 0.15, ease: EASE.power3Out },
        );

        if (done) a.finished.then(done);
        return a;
    },

    popLeave(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [1, 0], scale: [1, 0.7] },
            { duration: 0.1, ease: EASE.power3In },
        );

        if (done) a.finished.then(done);
        return a;
    },

    panelEnter(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [0, 1], x: [-20, 0] },
            { duration: 0.22, ease: EASE.power3Out },
        );

        if (done) a.finished.then(done);
        return a;
    },

    panelLeave(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [1, 0], x: [0, -15] },
            {
                duration: 0.12,
                ease: EASE.power3In,
            },
        );

        if (done) a.finished.then(done);
        return a;
    },

    fadeEnter(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(el, { opacity: [0, 1] }, { duration: 0.15 });
        if (done) a.finished.then(done);

        return a;
    },

    fadeLeave(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(el, { opacity: [1, 0] }, { duration: 0.12 });
        if (done) a.finished.then(done);

        return a;
    },

    turnCardEnter(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [0, 1], x: [-12, 0] },
            { duration: 0.25, ease: EASE.power2Out },
        );
        if (done) a.finished.then(done);

        return a;
    },

    turnCardLeave(el: Element | null, done?: () => void) {
        if (!el) return;

        const a = animate(
            el,
            { opacity: [1, 0], x: [0, -10] },
            { duration: 0.15, ease: EASE.power2Out },
        );
        if (done) a.finished.then(done);

        return a;
    },

    viewEnter(el: Element, done?: () => void) {
        const a = animate(
            el,
            { opacity: [0, 1], y: [10, 0] },
            { duration: 0.25, ease: EASE.power1Out },
        );

        if (done) a.finished.then(done);
        return a;
    },

    viewLeave(el: Element, done?: () => void) {
        const a = animate(
            el,
            { opacity: [1, 0], y: [0, -6] },
            { duration: 0.14, ease: EASE.power1In },
        );

        if (done) a.finished.then(done);
        return a;
    },
};
