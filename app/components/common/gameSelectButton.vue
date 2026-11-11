<script lang="ts" setup>
import { anim } from "~/assets/utils/animations/anim";

const props = defineProps<{
    gameName: "ats" | "ets2";
    isSelected: boolean;
    selectCard: (game: "ets2" | "ats" | null) => void;
}>();

function handleBtnClick(gameName: "ets2" | "ats" | null) {
    props.selectCard(gameName);
}
</script>

<template>
    <div
        v-press
        @click.prevent="handleBtnClick(gameName)"
        class="game-btn"
        :class="{ 'is-selected': isSelected }"
    >
        <div class="game-card-wrapper">
            <div class="game-name-wrapper">
                <slot name="icon"></slot>
                <p class="game-name">{{ gameName }}</p>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/gameSelectButton.scss"
></style>
