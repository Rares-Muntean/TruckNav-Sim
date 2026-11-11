<template>
    <div class="splash-screen">
        <div class="splash-content">
            <img src="/icon-only.png" alt="TruckNav Logo" class="splash-logo" />
            <div class="splash-loader"></div>
        </div>
    </div>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
.splash-screen {
    position: fixed;
    inset: 0;

    z-index: $loading-win-z-index;

    background-color: $primaryBackgroundColor;
    display: flex;
    align-items: center;
    justify-content: center;

    user-select: none;

    .splash-content {
        display: flex;
        flex-direction: column;
        align-items: center;

        gap: 1.4rem;

        .splash-logo {
            width: 84px;
            height: 84px;
            border-radius: 18px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .splash-loader {
            width: 28px;
            height: 28px;
            border: 3px solid $primaryLightButtonColor;
            border-top-color: $green-color;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
    }
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
