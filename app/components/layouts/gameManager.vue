<script lang="ts" setup>
import { ref, computed, watch, onMounted } from "vue";
import { animate } from "motion";

import {
    downloadMapData,
    isMapDownloaded,
    uninstallMapData,
} from "~/assets/utils/shared/fileManager";
import { generateTruckIcon } from "~/assets/utils/map/markers";
import { anim } from "~/assets/utils/animations/anim";

const { selectedGame, isBaseDownloaded } = useGameSelection();
const { updateProfile, updateGlobal, activeSettings } = useSettings();
const { isMobile, isElectron } = usePlatform();
const { t } = useTranslations();

const emit = defineEmits(["connected", "goBack"]);
const isAppReady = useState("isAppReady", () => false);

const truckRef = ref<HTMLElement | null>(null);

const isDownloading = ref(false);
const downloadProgress = ref(0);
const downloadingId = ref<string | null>(null);
const isModPanelOpen = ref(false);
const truckImgSrc = ref("");
const isConnected = ref(false);

const sectionRef = ref<HTMLElement | null>(null);

let truckAnimControl: ReturnType<typeof animate> | null = null;
let trackResizeObserver: ResizeObserver | null = null;

const downloadedMods = ref<Record<string, boolean>>({});

const modSizes = ref<Record<string, string>>({});

function getModUrls(fileName: string) {
    return [
        `https://trucknavapp.com/${fileName}`,
        `https://github.com/Rares-Muntean/TruckNav-Maps/releases/download/map-assets/${fileName}`,
    ];
}

const availableMods = computed(() => {
    if (!selectedGame.value) return [];

    const vanillaMod = {
        id: "none",
        name: `Vanilla`,
        description: "Base Game Map",
        urls: getModUrls(`${selectedGame.value}.zip`),
    };

    const mods: Record<
        string,
        { id: string; name: string; description: string; urls: string[] }[]
    > = {
        ets2: [
            {
                id: "promods-europe",
                name: "ProMods Europe",
                description: "Europe & Iceland Overhaul",
                urls: getModUrls("promods-europe.zip"),
            },
            {
                id: "grand-utopia",
                name: "Grand Utopia",
                description: "1:1 Fictional Island Map",
                urls: getModUrls("grand-utopia.zip"),
            },
            {
                id: "ro-extended",
                name: "Ro-Extended",
                description: "Eastern Europe & Black Sea",
                urls: getModUrls("ro-extended.zip"),
            },
            {
                id: "rusmap",
                name: "RusMap",
                description: "Russia & Belarus Expansion",
                urls: getModUrls("rusmap.zip"),
            },
            {
                id: "more-european-cities",
                name: "More European Cities",
                description: "Extra Cities & Delivery Hubs",
                urls: getModUrls("more-european-cities.zip"),
            },
        ],
        ats: [
            {
                id: "ats-expansion",
                name: "ATS Expansion",
                description: "Rural Towns & Farm Routes",
                urls: getModUrls("ats-expansion.zip"),
            },
            {
                id: "coast-to-coast",
                name: "Coast To Coast",
                description: "Full Continental US Map",
                urls: getModUrls("coast-to-coast.zip"),
            },
            {
                id: "promods-canada",
                name: "ProMods Canada",
                description: "British Columbia, Canada",
                urls: getModUrls("promods-canada.zip"),
            },
            {
                id: "reforma",
                name: "Reforma",
                description: "Mexico & Baja Overhaul",
                urls: getModUrls("reforma.zip"),
            },
            {
                id: "reforma-esterlon",
                name: "Reforma Esterlon",
                description: "Fictional Island Country",
                urls: getModUrls("reforma-esterlon.zip"),
            },
            {
                id: "reforma-sierra-nevada",
                name: "Reforma Sierra Nevada",
                description: "California Mountain Passes",
                urls: getModUrls("reforma-sierra-nevada.zip"),
            },
        ],
    };

    return [vanillaMod, ...(mods[selectedGame.value] || [])];
});

onMounted(async () => {
    if (isAppReady.value) {
        anim.pageEnter(sectionRef.value);
    }

    checkModStatuses();
    await fetchModSizes();
});

watch(isAppReady, (ready) => {
    if (ready) {
        anim.pageEnter(sectionRef.value);
    }
});

watch(selectedGame, async (newGame) => {
    if (newGame) {
        isBaseDownloaded.value = await isMapDownloaded(newGame);
        await checkModStatuses();
        await fetchModSizes();
    }
});

onUnmounted(() => {
    truckAnimControl?.stop();
    trackResizeObserver?.disconnect();
});

function runTruckAnimation() {
    if (!truckRef.value || !truckRef.value.parentElement) return;

    truckAnimControl?.stop();

    const trackWidth = (truckRef.value.parentElement.clientWidth || 180) - 56;

    truckAnimControl = animate(
        [
            [
                truckRef.value,
                { opacity: [0, 1], scale: [0.6, 1] },
                { duration: 0.35, ease: "easeOut" },
            ],
            [
                truckRef.value,
                { x: [0, trackWidth], opacity: 1, scale: 1 },
                { duration: 5, ease: "easeInOut" },
            ],
            [
                truckRef.value,
                { opacity: [1, 0], scale: [1, 0.6] },
                { duration: 0.35, ease: "easeOut" },
            ],
            [
                truckRef.value,
                { x: 0, opacity: 0, scale: 0.6 },
                { duration: 0.01 },
            ],
        ],
        {
            repeat: Infinity,
        },
    );
}

watch(truckRef, (el) => {
    trackResizeObserver?.disconnect();

    if (el && el.parentElement) {
        runTruckAnimation();

        trackResizeObserver = new ResizeObserver(() => {
            runTruckAnimation();
        });
        trackResizeObserver.observe(el.parentElement);
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

watch(
    [
        () => activeSettings.value?.arrowColor,
        () => activeSettings.value?.discColor,
        () => activeSettings.value?.rimColor,
        () => activeSettings.value?.outerRimEnabled,
    ],
    async ([arrowColor, discColor, rimColor]) => {
        const img = await generateTruckIcon(arrowColor, discColor, rimColor);
        truckImgSrc.value = img.src;
    },
    { immediate: true },
);

function handlePanelEnter(el: Element, done: () => void) {
    anim.panelEnter(el, done);

    const list = el.querySelector(".mod-list-container") as HTMLElement;
    if (list) {
        anim.staggerListX(list, 0.04);
    }
}

async function fetchModSizes() {
    for (const mod of availableMods.value) {
        if (modSizes.value[mod.id]) continue;
        if (!mod.urls[0]) continue;

        try {
            const res = await fetch(mod.urls[0], { method: "HEAD" });
            const bytes = res.headers.get("content-length");

            if (bytes) {
                const mb = (Number(bytes) / (1024 * 1024)).toFixed(1);
                modSizes.value[mod.id] = mb;
            }
        } catch (e) {
            console.warn(
                `[Mod Size] Could not fetch size for ${mod.name} - ${mod.id}:`,
                e,
            );
        }
    }
}

async function checkModStatuses() {
    if (!selectedGame.value) return;

    for (const mod of availableMods.value) {
        isBaseDownloaded.value = await isMapDownloaded(selectedGame.value);
        downloadedMods.value["none"] = isBaseDownloaded.value;

        if (mod.id === "none") continue;
        downloadedMods.value[mod.id] = await isMapDownloaded(mod.id);
    }
}

async function startDownload(mapId: string, zipUrls: string[]) {
    if (isDownloading.value) return;

    isDownloading.value = true;
    downloadingId.value = mapId;
    downloadProgress.value = 0;

    const actualId = mapId === "none" ? selectedGame.value : mapId;
    if (!actualId) return;

    const success = await downloadMapData(mapId, zipUrls, (percent) => {
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

const activeGame = computed(() => {
    if (selectedGame.value === "ets2") return "ETS2";
    else return "ATS";
});

const handleConnect = () => {
    updateGlobal("selectedGame", selectedGame.value);
    emit("connected");
};

function selectMod(modId: string | "none", modUrls: string[]) {
    if (downloadedMods.value[modId]) {
        updateProfile("activeMod", modId);
    } else if (!downloadedMods.value[modId] && !isDownloading.value) {
        startDownload(modId, modUrls);
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
    <section
        ref="sectionRef"
        class="section section-mobile-menu safe-padding-left safe-padding-right"
    >
        <div class="title-wrapper">
            <div class="section-title">
                <div
                    v-if="isElectron"
                    class="back-btn"
                    @click="emit('goBack')"
                    v-press
                >
                    <Icon name="lucide:arrow-left" size="24" />
                </div>
                <Icon class="icon" name="lucide:cast" />
                <span class="title">{{ t("mobile.pairWithComputer") }}</span>
            </div>

            <LiveDot :is-active="isConnected" />
        </div>

        <div class="scroll-body">
            <div class="top-content">
                <div class="select-sim-wrapper">
                    <p class="category-title">
                        {{ t("common.selectSimulator") }}
                    </p>
                    <GameSelection v-model="selectedGame" :width="150" />
                </div>
            </div>

            <AnimTransition type="view">
                <div
                    :key="`${selectedGame}-${isBaseDownloaded}`"
                    class="game-view-wrapper"
                >
                    <template v-if="isBaseDownloaded && selectedGame">
                        <div class="grid-wrapper">
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

                            <div class="top-buttons">
                                <p class="category-title">
                                    {{ t("common.maps") }}
                                </p>

                                <div class="active-mod-wrapper">
                                    <div class="choose-map-wrapper">
                                        <button
                                            @click="toggleModPanel"
                                            class="btn nav-btn full-width primary-color choose-map-btn"
                                            v-press
                                        >
                                            <Icon name="lucide:map" size="22" />
                                            <div class="active-mod">
                                                <span>
                                                    {{ activeModName }}</span
                                                >
                                                <span>{{ activeGame }}</span>
                                            </div>
                                            <div></div>
                                        </button>

                                        <button
                                            @click="uninstallMap()"
                                            class="btn nav-btn primary-color icon"
                                            v-press
                                        >
                                            <Icon
                                                name="lucide:trash-2"
                                                size="20"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="live-route">
                            <p class="category-title">
                                {{ t("common.liveRoute") }}
                            </p>

                            <div class="route-card-anim">
                                <div class="road-labels">
                                    <span class="route-caption">{{
                                        t("common.readyForDeparture")
                                    }}</span>
                                </div>

                                <div class="route-widget">
                                    <div class="route-anim">
                                        <div class="route-line">
                                            <div class="route-start">
                                                <Icon
                                                    name="lucide:warehouse"
                                                    size="20"
                                                />
                                            </div>

                                            <div
                                                ref="truckRef"
                                                class="route-truck truck-nav-marker"
                                            >
                                                <img
                                                    class="truck-icon"
                                                    :src="truckImgSrc"
                                                    alt=""
                                                />
                                            </div>

                                            <div class="route-end">
                                                <Icon
                                                    name="lucide:map-pin-check"
                                                    size="20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>

                    <template v-else>
                        <div class="middle-wrapper">
                            <div class="middle-icon-wrapper">
                                <Icon
                                    name="lucide:map-plus"
                                    size="80"
                                    class="middle-icon"
                                />
                            </div>

                            <div class="bottom-text">
                                <div class="header-wrapper">
                                    <span class="header">{{
                                        t("documentation.baseMapRequired")
                                    }}</span>
                                    <InfoBox
                                        position="left"
                                        type="note"
                                        class="info-box"
                                    >
                                        <template #content>
                                            <p>
                                                {{
                                                    t("common.companionActive")
                                                }}.
                                            </p>
                                        </template>
                                    </InfoBox>
                                </div>

                                <span class="sub-header">
                                    {{ t("documentation.downloadMapData") }}.
                                </span>
                            </div>
                        </div>
                    </template>
                </div>
            </AnimTransition>
        </div>

        <div class="bottom-action-wrapper" v-if="selectedGame">
            <AnimTransition type="view">
                <button
                    v-if="isBaseDownloaded"
                    @click.prevent="handleConnect"
                    class="btn nav-btn full-width"
                    key="nav-btn"
                    v-press
                >
                    <Icon name="lucide:map-pinned" size="20" />
                    <span>{{ t("buttons.startNav") }}</span>
                </button>

                <button
                    v-else
                    key="download-btn"
                    @click.prevent="
                        startDownload(
                            selectedGame,
                            getModUrls(`${selectedGame}.zip`),
                        )
                    "
                    class="btn nav-btn full-width bottom-download-button"
                    :disabled="isDownloading"
                    v-press
                >
                    <Icon name="lucide:download" size="20" />
                    <span>{{ t("common.downloadBaseMap") }}</span>

                    <ProgressBar
                        class="progress-bar"
                        :show="isDownloading && downloadingId == selectedGame"
                        :progress="
                            downloadProgress === -1 ? 99 : downloadProgress
                        "
                    />
                </button>
            </AnimTransition>
        </div>

        <Transition
            mode="out-in"
            @enter="handlePanelEnter"
            @leave="anim.panelLeave"
        >
            <PopupPanel
                class="no-padding"
                v-if="isModPanelOpen"
                @close="toggleModPanel"
            >
                <template #category-title>{{ t("modPanel.title") }}</template>
                <template #category-description>{{
                    t("modPanel.description")
                }}</template>

                <template #title>{{ t("modPanel.selectMapMod") }}</template>

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
                            @click="selectMod(mod.id, mod.urls)"
                            v-press
                        >
                            <div class="mod-info">
                                <span>{{ mod.name }}</span>
                                <AnimTransition type="ticker">
                                    <div
                                        class="tag"
                                        :class="{
                                            square: downloadedMods[mod.id],
                                        }"
                                        key="installed"
                                        v-if="downloadedMods[mod.id]"
                                    >
                                        <Icon
                                            class="check-icon"
                                            :class="{
                                                active: isModActive(mod.id),
                                            }"
                                            name="lucide:check"
                                        />
                                    </div>

                                    <div
                                        class="tag"
                                        key="not-installed"
                                        :class="{
                                            square: downloadedMods[mod.id],
                                        }"
                                        v-else
                                    >
                                        <div class="item-size">
                                            <span>{{
                                                modSizes[mod.id] || "-"
                                            }}</span>
                                            <span class="unit">MB</span>
                                        </div>
                                    </div>
                                </AnimTransition>
                            </div>

                            <div class="mod-actions">
                                <div class="mod-desc">
                                    {{ mod.description }}
                                </div>

                                <AnimTransition type="pop">
                                    <span
                                        class="downloading-text"
                                        key="downloading"
                                        v-if="downloadingId === mod.id"
                                    >
                                        {{ (downloadProgress || 0) + "%" }}
                                    </span>

                                    <button
                                        v-else-if="!downloadedMods[mod.id]"
                                        key="download"
                                        class="nav-btn dark icon map-mod-icon"
                                        @click.stop="
                                            startDownload(mod.id, mod.urls)
                                        "
                                        v-press
                                    >
                                        <Icon
                                            name="lucide:download"
                                            size="18"
                                        />
                                    </button>

                                    <button
                                        v-else
                                        key="trash"
                                        class="nav-btn dark icon trash-icon map-mod-icon"
                                        @click.stop="uninstallMap(mod.id)"
                                        v-press
                                    >
                                        <Icon name="lucide:trash-2" size="18" />
                                    </button>
                                </AnimTransition>
                            </div>

                            <ProgressBar
                                class="download-bar"
                                :show="downloadingId === mod.id"
                                :progress="
                                    downloadProgress === -1
                                        ? 99
                                        : downloadProgress
                                "
                                style="margin-top: 8px"
                                :bar-height="4"
                            />
                        </div>
                    </div>
                </div>
            </PopupPanel>
        </Transition>
    </section>
</template>

<style
    scoped
    lang="scss"
    src="~/assets/scss/scoped/layouts/gameManager.scss"
></style>
