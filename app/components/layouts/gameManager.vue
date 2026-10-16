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
const liveDotRef = ref<HTMLElement | null>(null);

const isDownloading = ref(false);
const downloadProgress = ref(0);
const downloadingId = ref<string | null>(null);
const isBaseDownloaded = ref(false);
const isModPanelOpen = ref(false);
const truckImgSrc = ref("");
const isConnected = ref(false);

let truckAnimControl: ReturnType<typeof animate> | null = null;
let liveDotAnimControl: ReturnType<typeof animate> | null = null;

const downloadedMods = ref<Record<string, boolean>>({});

const availableMods = computed(() => {
    if (!selectedGame.value) return [];

    const mods: Record<string, { id: string; name: string; url: string }[]> = {
        ets2: [
            {
                id: "promods-europe",
                name: "ProMods Europe",
                url: "https://trucknavapp.com/promods-europe.zip",
            },
            {
                id: "grand-utopia",
                name: "Grand Utopia",
                url: "https://trucknavapp.com/grand-utopia.zip",
            },
            {
                id: "ro-extended",
                name: "Ro-Extended",
                url: "https://trucknavapp.com/ro-extended.zip",
            },
            {
                id: "rusmap",
                name: "RusMap",
                url: "https://trucknavapp.com/rusmap.zip",
            },
            {
                id: "more-european-cities",
                name: "More European Cities",
                url: "https://trucknavapp.com/more-european-cities.zip",
            },
        ],
        ats: [
            {
                id: "ats-expansion",
                name: "ATS Expansion",
                url: "https://trucknavapp.com/ats-expansion.zip",
            },
            {
                id: "coast-to-coast",
                name: "Coast To Coast",
                url: "https://trucknavapp.com/coast-to-coast.zip",
            },
            {
                id: "promods-canada",
                name: "ProMods Canada",
                url: "https://trucknavapp.com/promods-canada.zip",
            },
            {
                id: "reforma",
                name: "Reforma",
                url: "https://trucknavapp.com/reforma.zip",
            },
            {
                id: "reforma-esterlon",
                name: "Reforma Esterlon",
                url: "https://trucknavapp.com/reforma-esterlon.zip",
            },
            {
                id: "reforma-sierra-nevada",
                name: "Reforma Sierra Nevada",
                url: "https://trucknavapp.com/reforma-sierra-nevada.zip",
            },
        ],
    };
    return mods[selectedGame.value] || [];
});

onMounted(async () => {
    if (selectedGame.value) {
        isBaseDownloaded.value = await isMapDownloaded(selectedGame.value);
        await checkModStatuses();
    }
});

onUnmounted(() => {
    liveDotAnimControl?.stop();
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

watch([liveDotRef, isConnected], ([el, connected]) => {
    if (el) {
        liveDotAnimControl?.stop();
        const sonar = el.querySelector(".sonar");
        if (!sonar) return;

        const animDuration = connected ? 3.4 : 5;

        liveDotAnimControl = animate(
            [
                [
                    liveDotRef.value,
                    { opacity: [0.4, 1, 0.4], scale: [0.7, 1, 0.7] },
                    {
                        repeat: Infinity,
                        duration: animDuration,
                        ease: "backInOut",
                        repeatType: "reverse",
                    },
                ],
                [
                    sonar,
                    {
                        scale: [1, 2],
                        opacity: [0.8, 0],
                    },
                    {
                        duration: animDuration,
                        ease: "easeOut",
                        at: "<",
                    },
                ],
            ],
            {
                repeat: Infinity,
            },
        );
    } else {
        liveDotAnimControl?.stop();
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
    for (const mod of availableMods.value) {
        downloadedMods.value[mod.id] = await isMapDownloaded(mod.id);
    }
}

async function startDownload(mapId: string, zipUrl: string) {
    isDownloading.value = true;
    downloadingId.value = mapId;
    downloadProgress.value = 0;

    const success = await downloadMapData(mapId, zipUrl, (percent) => {
        downloadProgress.value = percent;
    });

    isDownloading.value = false;
    downloadingId.value = null;

    if (success) {
        if (mapId === selectedGame.value) {
            isBaseDownloaded.value = true;
        } else {
            downloadedMods.value[mapId] = true;
        }
    }
}

async function uninstallMap(mapId?: string) {
    const idToUninstall = mapId || selectedGame.value;
    if (!idToUninstall) return;

    await uninstallMapData(idToUninstall);

    if (activeSettings.value.activeMod === idToUninstall) {
        updateProfile("activeMod", "none");
    }

    setTimeout(async () => {
        const stillExists = await isMapDownloaded(idToUninstall);
        if (idToUninstall === selectedGame.value) {
            isBaseDownloaded.value = stillExists;
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
    updateProfile("activeMod", modId);
    toggleModPanel();
}

function toggleModPanel() {
    isModPanelOpen.value = !isModPanelOpen.value;
}
</script>

<template>
    <section class="section-mobile-menu">
        <div class="title-wrapper">
            <div class="title">
                <div v-if="isElectron" class="back-btn" @click="emit('goBack')">
                    <Icon name="lucide:arrow-left" size="24" />
                </div>
                <Icon class="icon" name="lucide:cast" size="20" />
                <span>{{ t("mobile.pairWithComputer") }}</span>
            </div>

            <div
                ref="liveDotRef"
                class="live"
                :class="isConnected ? 'connected' : 'disconnected'"
            >
                <div
                    class="sonar"
                    :class="isConnected ? 'connected' : 'disconnected'"
                ></div>
            </div>
        </div>

        <div class="separator"></div>

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

            <Transition name="panel-pop">
                <PopupPanel
                    v-if="isModPanelOpen"
                    title="Select Map Mod"
                    @close="toggleModPanel"
                >
                    <div class="mod-list-container">
                        <div class="mod-item">
                            <div class="mod-info">
                                <strong>Vanilla</strong>
                            </div>
                            <div class="mod-actions">
                                <button
                                    class="nav-btn dark"
                                    @click="selectMod('none')"
                                    :disabled="
                                        activeSettings.activeMod === 'none' ||
                                        !activeSettings.activeMod
                                    "
                                >
                                    {{
                                        activeSettings.activeMod === "none" ||
                                        !activeSettings.activeMod
                                            ? "Selected"
                                            : "Select"
                                    }}
                                </button>
                            </div>
                        </div>

                        <div
                            v-for="mod in availableMods"
                            :key="mod.id"
                            class="mod-item"
                        >
                            <div class="mod-info">
                                <strong>{{ mod.name }}</strong>
                                <ProgressBar
                                    v-if="downloadingId === mod.id"
                                    :progress="
                                        downloadProgress === -1
                                            ? 99
                                            : downloadProgress
                                    "
                                    style="margin-top: 8px"
                                />
                            </div>

                            <div class="mod-actions">
                                <button
                                    v-if="
                                        !downloadedMods[mod.id] &&
                                        downloadingId !== mod.id
                                    "
                                    class="nav-btn icon map-mod-icon"
                                    @click="startDownload(mod.id, mod.url)"
                                >
                                    <Icon name="lucide:download" size="20" />
                                </button>

                                <span
                                    class="downloading-text"
                                    v-else-if="downloadingId === mod.id"
                                >
                                    {{
                                        downloadProgress === -1
                                            ? "In Progress"
                                            : (downloadProgress || 0) + "%"
                                    }}
                                </span>

                                <template v-else>
                                    <button
                                        class="nav-btn"
                                        @click="selectMod(mod.id)"
                                        :disabled="
                                            activeSettings.activeMod === mod.id
                                        "
                                    >
                                        {{
                                            activeSettings.activeMod === mod.id
                                                ? "Selected"
                                                : "Select"
                                        }}
                                    </button>

                                    <button
                                        class="nav-btn dark icon map-mod-icon"
                                        @click="uninstallMap(mod.id)"
                                    >
                                        <Icon name="lucide:trash-2" size="20" />
                                    </button>
                                </template>
                            </div>
                        </div>

                        <div v-if="availableMods.length === 0" class="no-mods">
                            No mods are currently available for this game.
                        </div>
                    </div>
                </PopupPanel>
            </Transition>
        </div>
    </section>
</template>

<style
    scoped
    lang="scss"
    src="~/assets/scss/scoped/layouts/gameManager.scss"
></style>

<style scoped lang="scss">
/* Adding some basic styles for the mod list popup layout */
.mod-list-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 0;

    .mod-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: $menu-item-gradient;
        padding: 12px;
        border-radius: 5px;

        .mod-info {
            display: flex;
            flex-direction: column;
            flex: 1;
            margin-right: 12px;

            p {
                margin: 0;
                font-size: 1.2rem;
                opacity: 0.6;
            }
        }

        .mod-actions {
            display: flex;
            align-items: center;
            gap: 8px;

            .select-btn {
                background: #3b82f6;
                color: white;
            }

            .download-btn {
                background: #10b981;
                color: white;
            }

            .downloading-text {
                opacity: 0.8;
                padding: 0 10px;
            }

            .map-mod-icon {
                padding: 8px 10px;
            }
        }
    }

    .no-mods {
        text-align: center;
        padding: 20px;
        opacity: 0.6;
        font-size: 0.9rem;
    }
}
</style>
