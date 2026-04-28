<script lang="ts" setup>
const props = defineProps<{
    launchMap: () => void;
    goToDesktopIndex: () => void;
}>();
const { selectedGame, commitSelection } = useGameSelection();
const { isWeb, isElectron } = usePlatform();
const { t } = useTranslations();

const handleStart = () => {
    commitSelection();
    props.launchMap();
};
</script>

<template>
    <div class="choose-game-section">
        <div class="top-tagline">
            <button
                v-show="isElectron"
                @click="goToDesktopIndex"
                class="back-btn"
            >
                <Icon name="lucide:arrow-left" size="22" />
            </button>

            <Icon name="lucide:earth" class="icon" size="22" />
            <span>{{ t("common.selectGame") }}</span>
        </div>

        <div class="game-selection" :style="{ width: isWeb ? '80%' : '85%' }">
            <div class="select-btns">
                <GameSelection
                    v-model="selectedGame"
                    :width="isWeb ? 450 : 950"
                />
            </div>
        </div>

        <button
            :disabled="!selectedGame"
            @click.prevent="handleStart"
            class="btn nav-btn"
            autofocus
        >
            <span>{{ t("common.startNavigation") }}</span>
            <Icon name="lucide:map-pinned" size="20" />
        </button>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/layouts/chooseGame.scss"
></style>
