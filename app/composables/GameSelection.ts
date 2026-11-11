import { isMapDownloaded } from "~/assets/utils/shared/fileManager";

export const useGameSelection = () => {
    const { settings, updateGlobal } = useSettings();

    const selectedGame = computed<"ats" | "ets2">({
        get: () => (settings.value.selectedGame as "ats" | "ets2") || "ets2",
        set: (val) => updateGlobal("selectedGame", val),
    });

    const isBaseDownloaded = useState<boolean>("isBaseDownloaded", () => false);

    const checkBaseMapStatus = async (game?: "ats" | "ets2") => {
        const target = game || selectedGame.value;
        if (target) {
            isBaseDownloaded.value = await isMapDownloaded(target);
        }
        return isBaseDownloaded.value;
    };

    return {
        selectedGame,
        isBaseDownloaded,
        checkBaseMapStatus,
    };
};
