<script lang="ts" setup>
const { t } = useTranslations();
</script>

<template>
    <div class="card delivery-info">
        <div class="card-title-wrapper">
            <p class="card-title">{{ t("common.freeRoam") }}</p>
            <Icon name="lucide:route" class="card-icon" />
        </div>

        <div class="middle-wrapper">
            <div class="middle-icon-wrapper">
                <Icon name="lucide:compass" size="70" class="middle-icon" />
            </div>

            <div class="bottom-text">
                <div class="header-wrapper">
                    <span class="header">{{
                        t("documentation.openRoad")
                    }}</span>
                </div>

                <span class="sub-header">
                    {{ t("documentation.openRoadDescription") }}.
                </span>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/telemetry/telemetryTripCards.scss"
></style>
