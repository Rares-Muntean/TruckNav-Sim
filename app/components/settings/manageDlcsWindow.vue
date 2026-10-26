<script lang="ts" setup>
const { settings, activeSettings, updateProfile } = useSettings();
const { t } = useTranslations();

import { ets2Expansions } from "~/data/ets2/ets2Expansions";
import { atsExpansions } from "~/data/ats/atsExpansions";

const loadedImages = ref<Record<number, boolean>>({});

const onImageLoaded = (id: number) => {
    loadedImages.value[id] = true;
};

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
        <div v-for="(dlc, id) in currentExpansion" :key="id">
            <div
                class="dlc"
                @click="toggleDlc(Number(id))"
                :class="{
                    'is-selected': activeSettings.ownedDlcs.includes(
                        Number(id),
                    ),
                }"
            >
                <div class="dlc-details-wrapper">
                    <div class="dlc-details">
                        <div class="top-wrapper">
                            <p class="dlc-name">{{ dlc.name }}</p>
                            <div
                                class="checkmarks"
                                :class="{
                                    'is-selected':
                                        activeSettings.ownedDlcs.includes(
                                            Number(id),
                                        ),
                                }"
                            >
                                <Icon
                                    v-if="
                                        activeSettings.ownedDlcs.includes(
                                            Number(id),
                                        )
                                    "
                                    name="lucide:circle-check"
                                    size="22"
                                />
                                <Icon v-else name="lucide:circle" size="22" />
                            </div>
                        </div>

                        <p class="dlc-release-date">
                            {{ t("settings.releaseDate") }}:
                            {{ dlc.releaseDate }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    src="~/assets/scss/scoped/settings/manageDlcsWindow.scss"
></style>
