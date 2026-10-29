<script lang="ts" setup>
defineProps<{
    gameName: "ats" | "ets2";
    selectCard: (game: "ets2" | "ats" | null) => void;
}>();
</script>

<template>
    <div @click.prevent="selectCard(gameName)" class="game-btn">
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
