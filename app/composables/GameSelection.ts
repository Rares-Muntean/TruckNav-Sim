export const useGameSelection = () => {
    const { settings, updateGlobal } = useSettings();

    const selectedGame = useState<"ats" | "ets2" | null>(
        "selected_game_state",
        () => settings.value.selectedGame,
    );

    watch(
        () => settings.value.selectedGame,
        (newVal) => {
            if (newVal === null) return;
            selectedGame.value = newVal;
        },
    );

    const selectGame = (game: "ats" | "ets2" | null) => {
        selectedGame.value = game;
    };

    const commitSelection = () => {
        if (selectedGame.value) {
            updateGlobal("selectedGame", selectedGame.value);
        }
    };

    return { selectedGame, selectGame, commitSelection };
};
