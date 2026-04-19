<script lang="ts" setup>
defineProps<{
    gameName: "ats" | "ets2";
    selectCard: (game: "ets2" | "ats" | null) => void;
    width: number;
}>();
</script>

<template>
    <div
        @click.prevent="selectCard(gameName)"
        class="game-btn"
        :style="{ maxWidth: `${width}px` }"
    >
        <img :src="`/images/game-covers/${gameName}.webp`" alt="" />
        <div class="game-name-wrapper">
            <p class="game-name">{{ gameName }}</p>
            <slot name="icon"></slot>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/gameSelectButton.scss"
></style>
