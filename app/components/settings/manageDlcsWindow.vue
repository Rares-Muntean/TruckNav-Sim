<script lang="ts" setup>
const { settings, activeSettings, updateProfile } = useSettings();
const { t } = useTranslations();

import { ets2Expansions } from "~/data/ets2/ets2Expansions";
import { atsExpansions } from "~/data/ats/atsExpansions";

const currentExpansion = computed(() => {
    return settings.value.selectedGame === "ets2"
        ? ets2Expansions
        : atsExpansions;
});

const toggleDlc = (id: number) => {
    const currentList = [...activeSettings.value.ownedDlcs];

    const index = currentList.indexOf(id);

    if (index !== -1) {
        currentList.splice(index, 1);
    } else {
        currentList.push(id);
    }

    updateProfile("ownedDlcs", currentList);
};
</script>

<template>
    <div class="manage-dlcs-window">
        <div
            v-for="(dlc, id) in currentExpansion"
            :key="id"
            class="dlc"
            @click="toggleDlc(Number(id))"
            :class="{
                'is-selected': activeSettings.ownedDlcs.includes(Number(id)),
            }"
        >
            <div class="dlc-details-wrapper">
                <div class="dlc-details">
                    <div class="top-wrapper">
                        <p class="dlc-name">{{ dlc.name }}</p>

                        <div
                            v-if="settings.selectedGame === 'ets2'"
                            class="flag-wrapper"
                        >
                            <Icon :name="dlc.icon" class="flag-icon" />
                        </div>

                        <div class="flag-wrapper" v-else>
                            <div class="state-tag">{{ dlc.icon }}</div>
                        </div>
                    </div>

                    <p class="dlc-release-date">
                        {{ dlc.releaseDate }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/manageDlcsWindow.scss"
></style>
