export default defineNuxtPlugin(async () => {
    const { initSettings } = useSettings();
    initSettings();

    const { initDesktopSettings } = useDesktopSettings();
    await initDesktopSettings();
});
