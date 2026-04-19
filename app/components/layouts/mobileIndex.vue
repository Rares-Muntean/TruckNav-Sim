<script lang="ts" setup>
const { selectedGame } = useGameSelection();

const emit = defineEmits(["connected"]);
</script>

<template>
    <section class="section-mobile-menu">
        <div class="title">
            <Icon class="icon" name="lucide:cast" size="20" />
            <span>Pair with Computer</span>
        </div>

        <div class="content">
            <GameSelection v-model="selectedGame" :width="150" />

            <InputComputerIP
                @connected="emit('connected')"
                :style="{ width: '100%' }"
                :require-game="true"
            />
        </div>
    </section>
</template>

<style
    scoped
    lang="scss"
    src="~/assets/scss/scoped/layouts/mobileIndex.scss"
></style>
