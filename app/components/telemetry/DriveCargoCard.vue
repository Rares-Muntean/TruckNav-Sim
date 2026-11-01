<script lang="ts" setup>
import { getStatusLevel } from "~/assets/utils/telemetry/helpers";

const { cargo } = useEtsTelemetry();

const { kgToUserUnits, weightUnit } = useUnitConversion();

const props = defineProps<{
    variant?: "drive-view";
}>();

const cargoWeightConverted = computed(() => kgToUserUnits(cargo.value.mass));

const cargoDamageStatusColor = computed(() =>
    getStatusLevel("cargoDamage", cargo.value.cargoDamage),
);
</script>

<template>
    <div class="card" :class="variant">
        <div class="data-pill">
            <div class="data-value-wrapper data-title">
                <Icon name="lucide:box" class="icon" />

                <div class="text-group">
                    <p class="card-value-number string">
                        {{ cargo.name }}
                    </p>

                    <span class="cargo-dmg">({{ cargo.cargoDamage }}%)</span>
                </div>
            </div>

            <div class="unit-group cargo">
                <span>{{ cargoWeightConverted }}</span>
                <span>{{ weightUnit }}</span>
            </div>
        </div>

        <div class="bottom-progress">
            <ProgressBar
                :progress="cargo.cargoDamage"
                :bar-height="4"
                :color="cargoDamageStatusColor"
                class="full-width-bar"
            />
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/telemetry/telemetryTripCards.scss"
></style>
