import { vPress } from "~/assets/utils/directives/vPress";

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.directive("press", vPress);
});
