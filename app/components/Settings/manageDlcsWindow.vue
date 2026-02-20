<script lang="ts" setup>
const { settings, updateSettings } = useSettings();
import { ets2Expansions } from "~~/shared/constants/ets2Expansions";

defineProps<{ closePanel: () => void }>();

const loadedImages = ref<Record<number, boolean>>({});

const onImageLoaded = (id: number) => {
    loadedImages.value[id] = true;
};

const toggleDlc = (id: number) => {
    const currentList = [...settings.value.ownedDlcs];

    const index = currentList.indexOf(id);

    if (index !== -1) {
        currentList.splice(index, 1);
    } else {
        currentList.push(id);
    }

    updateSettings("ownedDlcs", currentList);
};
</script>

<template>
    <div class="manage-dlcs-section">
        <div @click="closePanel" class="background-overlay"></div>
        <div class="manage-dlcs-window">
            <div v-for="(dlc, id) in ets2Expansions" :key="id">
                <div
                    class="dlc"
                    @click="toggleDlc(Number(id))"
                    :class="{
                        'is-selected': settings.ownedDlcs.includes(Number(id)),
                    }"
                >
                    <div class="dlc-details-wrapper">
                        <div class="dlc-image">
                            <div
                                v-if="!loadedImages[Number(id)]"
                                class="skeleton-loader"
                            ></div>

                            <img
                                :src="`/images/ets2-dlcs/${dlc.imagePath}`"
                                :alt="dlc.name"
                                class="dlc-cover"
                                :class="{
                                    'is-loaded': loadedImages[Number(id)],
                                }"
                                @load="onImageLoaded(Number(id))"
                            />
                        </div>

                        <div class="dlc-details">
                            <p class="dlc-name">{{ dlc.name }}</p>
                            <p class="dlc-release-date">
                                Release Date: {{ dlc.releaseDate }}
                            </p>
                        </div>
                    </div>
                    <div
                        class="checkmarks"
                        :class="{
                            'is-selected': settings.ownedDlcs.includes(
                                Number(id),
                            ),
                        }"
                    >
                        <Icon
                            v-if="settings.ownedDlcs.includes(Number(id))"
                            name="ic:round-check-circle"
                            size="26"
                        />
                        <Icon
                            v-else
                            name="ic:round-radio-button-unchecked"
                            size="26"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" src="~/assets/scss/scoped/manageDlcsWindow.scss"></style>
