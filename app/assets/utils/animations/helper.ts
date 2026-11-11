import { anim } from "./anim";

export function handlePanelEnter(el: Element, done: () => void, query: string) {
    anim.panelEnter(el, done);

    const list = el.querySelector(`.${query}`) as HTMLElement;
    if (list) {
        anim.staggerListX(list, 0.04);
    }
}
