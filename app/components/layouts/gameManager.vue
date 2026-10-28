<script lang="ts" setup>
import { ref, computed, watch, onMounted } from "vue";
import { animate } from "motion";

import {
    downloadMapData,
    isMapDownloaded,
    uninstallMapData,
} from "~/assets/utils/shared/fileManager";
import { generateTruckIcon } from "~/assets/utils/map/markers";

const { selectedGame } = useGameSelection();
const { commitSelection } = useGameSelection();
const { updateProfile, activeSettings } = useSettings();
const { isMobile, isElectron } = usePlatform();
const { t } = useTranslations();

const emit = defineEmits(["connected", "goBack"]);

const truckRef = ref<HTMLElement | null>(null);

const isDownloading = ref(false);
const downloadProgress = ref(0);
const downloadingId = ref<string | null>(null);
const isBaseDownloaded = ref(false);
const isModPanelOpen = ref(false);
const truckImgSrc = ref("");
const isConnected = ref(false);

let truckAnimControl: ReturnType<typeof animate> | null = null;

const downloadedMods = ref<Record<string, boolean>>({});

const availableMods = computed(() => {
    if (!selectedGame.value) return [];

    const vanillaMod = {
        id: "none",
        name: "Vanilla",
        description: "Base Game Map",
        url: `https://trucknavapp.com/${selectedGame.value}.zip`,
    };

    const mods: Record<
        string,
        { id: string; name: string; description: string; url: string }[]
    > = {
        ets2: [
            {
                id: "promods-europe",
                name: "ProMods Europe",
                description: "Europe & Iceland Overhaul",
                url: "https://trucknavapp.com/promods-europe.zip",
            },
            {
                id: "grand-utopia",
                name: "Grand Utopia",
                url: "https://trucknavapp.com/grand-utopia.zip",
                description: "1:1 Fictional Island Map",
            },
            {
                id: "ro-extended",
                name: "Ro-Extended",
                description: "Eastern Europe & Black Sea",
                url: "https://trucknavapp.com/ro-extended.zip",
            },
            {
                id: "rusmap",
                name: "RusMap",
                description: "Russia & Belarus Expansion",
                url: "https://trucknavapp.com/rusmap.zip",
            },
            {
                id: "more-european-cities",
                name: "More European Cities",
                description: "Extra Cities & Delivery Hubs",
                url: "https://trucknavapp.com/more-european-cities.zip",
            },
        ],
        ats: [
            {
                id: "ats-expansion",
                name: "ATS Expansion",
                description: "Rural Towns & Farm Routes",
                url: "https://trucknavapp.com/ats-expansion.zip",
            },
            {
                id: "coast-to-coast",
                name: "Coast To Coast",
                description: "Full Continental US Map",
                url: "https://trucknavapp.com/coast-to-coast.zip",
            },
            {
                id: "promods-canada",
                name: "ProMods Canada",
                description: "British Columbia, Canada",
                url: "https://trucknavapp.com/promods-canada.zip",
            },
            {
                id: "reforma",
                name: "Reforma",
                description: "Mexico & Baja Overhaul",
                url: "https://trucknavapp.com/reforma.zip",
            },
            {
                id: "reforma-esterlon",
                name: "Reforma Esterlon",
                description: "Fictional Island Country",
                url: "https://trucknavapp.com/reforma-esterlon.zip",
            },
            {
                id: "reforma-sierra-nevada",
                name: "Reforma Sierra Nevada",
                description: "California Mountain Passes",
                url: "https://trucknavapp.com/reforma-sierra-nevada.zip",
            },
        ],
    };

    return [vanillaMod, ...(mods[selectedGame.value] || [])];
});

onMounted(async () => {
    if (selectedGame.value) {
        isBaseDownloaded.value = await isMapDownloaded(selectedGame.value);
        await checkModStatuses();
    }
});

onUnmounted(() => {
    truckAnimControl?.stop();
});

watch(truckRef, (el) => {
    if (el) {
        truckAnimControl?.stop();

        const trackWidth = (el.parentElement?.clientWidth || 180) - 24;

        truckAnimControl = animate(
            [
                [
                    truckRef.value,
                    { x: [0, trackWidth] },
                    {
                        duration: 4,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                    },
                ],
                [
                    truckRef.value,
                    { rotate: 180 },
                    {
                        duration: 1,
                        ease: "backInOut",
                    },
                ],
                [
                    truckRef.value,
                    { x: [trackWidth, 0] },
                    {
                        duration: 4,
                        ease: "easeInOut",
                    },
                ],
                [
                    truckRef.value,
                    { rotate: 0 },
                    {
                        duration: 1,
                        ease: "backInOut",
                    },
                ],
            ],
            {
                repeat: Infinity,
            },
        );
    } else {
        truckAnimControl?.stop();
    }
});

watch(selectedGame, async (newGame) => {
    if (newGame) {
        isBaseDownloaded.value = await isMapDownloaded(newGame);
        await checkModStatuses();
    }
});

watch(isModPanelOpen, async (isOpen) => {
    if (isOpen) {
        await checkModStatuses();
    }
});

watch(
    () => activeSettings.value?.themeColor,
    async (newColor) => {
        if (newColor) {
            const img = await generateTruckIcon(newColor);
            truckImgSrc.value = img.src;
        }
    },
    { immediate: true },
);

async function checkModStatuses() {
    if (!selectedGame.value) return;

    for (const mod of availableMods.value) {
        isBaseDownloaded.value = await isMapDownloaded(selectedGame.value);
        downloadedMods.value["none"] = isBaseDownloaded.value;

        if (mod.id === "none") continue;
        downloadedMods.value[mod.id] = await isMapDownloaded(mod.id);
    }
}

async function startDownload(mapId: string, zipUrl: string) {
    isDownloading.value = true;
    downloadingId.value = mapId;
    downloadProgress.value = 0;

    const actualId = mapId === "none" ? selectedGame.value : mapId;
    if (!actualId) return;

    const success = await downloadMapData(mapId, zipUrl, (percent) => {
        downloadProgress.value = percent;
    });

    isDownloading.value = false;
    downloadingId.value = null;

    if (success) {
        if (mapId === "none" || mapId === selectedGame.value) {
            isBaseDownloaded.value = true;
            downloadedMods.value["none"] = true;
        } else {
            downloadedMods.value[mapId] = true;
        }
    }
}

async function uninstallMap(mapId?: string) {
    const idToUninstall =
        mapId === "none" || !mapId ? selectedGame.value : mapId;
    if (!idToUninstall) return;

    await uninstallMapData(idToUninstall);

    if (mapId === "none" || !mapId) {
        isModPanelOpen.value = false;
    }

    if (
        activeSettings.value.activeMod === mapId ||
        activeSettings.value.activeMod === idToUninstall
    ) {
        updateProfile("activeMod", "none");
    }

    setTimeout(async () => {
        const stillExists = await isMapDownloaded(idToUninstall);
        if (idToUninstall === selectedGame.value) {
            isBaseDownloaded.value = stillExists;
            downloadedMods.value["none"] = stillExists;
        } else {
            downloadedMods.value[idToUninstall] = stillExists;
        }
    }, 300);
}

const activeModName = computed(() => {
    const modId = activeSettings.value?.activeMod;

    if (!modId || modId === "none") {
        return "Vanilla";
    }

    const matchedMod = availableMods.value.find((mod) => mod.id === modId);
    return matchedMod ? matchedMod.name : modId;
});

const handleConnect = () => {
    commitSelection();
    emit("connected");
};

function selectMod(modId: string | "none") {
    if (downloadedMods.value[modId]) {
        updateProfile("activeMod", modId);
    }
}

function toggleModPanel() {
    isModPanelOpen.value = !isModPanelOpen.value;
}

const isModActive = (modId: string) => {
    return (activeSettings.value?.activeMod || "none") === modId;
};
</script>

<template>
    <section class="section section-mobile-menu">
        <div class="title-wrapper">
            <div class="section-title">
                <div v-if="isElectron" class="back-btn" @click="emit('goBack')">
                    <Icon name="lucide:arrow-left" size="24" />
                </div>
                <Icon class="icon" name="lucide:cast" />
                <span>{{ t("mobile.pairWithComputer") }}</span>
            </div>

            <LiveDot :is-active="isConnected" />
        </div>

        <div class="content">
            <div class="top-content">
                <div class="select-sim-wrapper">
                    <p class="category-title">
                        {{ t("common.selectSimulator") }}
                    </p>
                    <GameSelection v-model="selectedGame" :width="150" />
                </div>

                <div
                    v-if="isBaseDownloaded && selectedGame"
                    class="top-buttons"
                >
                    <p class="category-title">
                        {{ t("common.maps") }}
                    </p>

                    <div class="selected-map pill">
                        {{ activeModName }}
                    </div>

                    <div class="choose-map-wrapper">
                        <button
                            @click="toggleModPanel"
                            class="btn nav-btn full-width primary-color"
                        >
                            <Icon name="lucide:map-plus" size="20" />
                            <span>
                                {{ t("common.chooseMap") }}
                            </span>
                        </button>

                        <button
                            @click="uninstallMap()"
                            class="btn nav-btn primary-color icon"
                        >
                            <Icon name="lucide:trash-2" size="20" />
                        </button>
                    </div>
                </div>
            </div>

            <template v-if="isBaseDownloaded && selectedGame">
                <div class="connect" v-if="isMobile">
                    <p class="category-title">
                        {{ t("common.connection") }}
                    </p>

                    <div class="input-ip">
                        <InputComputerIP
                            v-model="isConnected"
                            :require-game="true"
                        />
                    </div>
                </div>

                <div class="live-route">
                    <p class="category-title">{{ t("common.liveRoute") }}</p>

                    <div class="route-card-anim">
                        <div class="road-labels">
                            <span class="route-caption">{{
                                t("common.readyForDeparture")
                            }}</span>
                        </div>

                        <div class="route-widget">
                            <div class="route-anim">
                                <div class="route-line">
                                    <div ref="truckRef" class="route-truck">
                                        <img
                                            class="truck-icon"
                                            :src="truckImgSrc"
                                            alt=""
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="start-btn-wrapper">
                    <button
                        @click.prevent="handleConnect"
                        class="btn nav-btn full-width"
                    >
                        <Icon name="lucide:map-pinned" size="20" />

                        <span>Start Navigation</span>
                    </button>
                </div>
            </template>

            <template v-else-if="!isBaseDownloaded && selectedGame">
                <div class="middle-wrapper">
                    <div class="icon-wrapper">
                        <Icon name="lucide:map-plus" size="80" class="icon" />
                    </div>

                    <div class="bottom-text">
                        <div class="header-wrapper">
                            <span class="header">Base Map Required</span>
                            <InfoBox
                                position="left"
                                type="note"
                                class="info-box"
                            >
                                <template #content>
                                    <p>{{ t("common.companionActive") }}.</p>
                                </template></InfoBox
                            >
                        </div>

                        <span class="sub-header">
                            Download the map data to enable live GPS navigation.
                        </span>
                    </div>
                </div>

                <div class="bottom-download-wrapper">
                    <button
                        @click.prevent="
                            startDownload(
                                selectedGame,
                                `https://trucknavapp.com/${selectedGame}.zip`,
                            )
                        "
                        class="btn nav-btn full-width bottom-download-button"
                        :disabled="isDownloading"
                    >
                        <Icon name="lucide:download" size="20" />
                        <span> {{ t("common.downloadBaseMap") }}</span>

                        <ProgressBar
                            class="progress-bar"
                            v-if="
                                isDownloading && downloadingId == selectedGame
                            "
                            :progress="
                                downloadProgress === -1 ? 99 : downloadProgress
                            "
                        />
                    </button>
                </div>
            </template>

            <PopupPanel v-if="isModPanelOpen" @close="toggleModPanel">
                <template #icon
                    ><Icon name="lucide:map-plus" class="icon"
                /></template>

                <template #title>Select Map Mod</template>

                <div class="mods-content">
                    <p class="category-title">
                        {{ selectedGame }} {{ t("common.mods") }}
                    </p>
                    <div class="mod-list-container">
                        <div
                            v-for="mod in availableMods"
                            :key="mod.id"
                            class="mod-item"
                            :class="{ active: isModActive(mod.id) }"
                            @click="selectMod(mod.id)"
                        >
                            <div class="mod-info">
                                <span>{{ mod.name }}</span>

                                <span v-if="isModActive(mod.id)" class="">
                                    <LiveDot :is-active="isModActive(mod.id)" />
                                </span>
                            </div>

                            <div class="mod-actions">
                                <div class="mod-desc">
                                    {{ mod.description }}
                                </div>

                                <span
                                    class="downloading-text"
                                    v-if="downloadingId === mod.id"
                                >
                                    {{ (downloadProgress || 0) + "%" }}
                                </span>

                                <button
                                    v-else-if="!downloadedMods[mod.id]"
                                    class="nav-btn dark icon map-mod-icon"
                                    @click.stop="startDownload(mod.id, mod.url)"
                                >
                                    <Icon name="lucide:download" size="20" />
                                </button>

                                <div v-else class="mod-installed">
                                    <button
                                        class="nav-btn primary-color icon map-mod-icon"
                                        @click.stop="uninstallMap(mod.id)"
                                    >
                                        <Icon name="lucide:trash-2" size="20" />
                                    </button>
                                </div>
                            </div>

                            <ProgressBar
                                class="download-bar"
                                v-if="downloadingId === mod.id"
                                :progress="
                                    downloadProgress === -1
                                        ? 99
                                        : downloadProgress
                                "
                                style="margin-top: 8px"
                            />
                        </div>
                    </div>
                </div>
            </PopupPanel>
        </div>
    </section>
</template>

<style
    scoped
    lang="scss"
    src="~/assets/scss/scoped/layouts/gameManager.scss"
></style>
