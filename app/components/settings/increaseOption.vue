<script lang="ts" setup>
const { settings, updateGlobal } = useSettings();

type globalKeys = keyof Omit<AppSettingsState, "profiles">;

let holdTimer: ReturnType<typeof setTimeout> | null = null;
let repeatInterval: ReturnType<typeof setInterval> | null = null;

const props = defineProps<{
    optionTitle: string;
    settingName: globalKeys;

    maxValue: number;
    minValue: number;

    amount: number;
}>();

const currentSize = computed(() => settings.value[props.settingName]);

const isAtMaxValue = computed(
    () => (settings.value[props.settingName] as number) >= props.maxValue,
);
const isAtMinValue = computed(
    () => (settings.value[props.settingName] as number) <= props.minValue,
);

function updateSize(mode: "+" | "-") {
    const currentVal = settings.value[props.settingName] as number;
    let nextValue =
        mode === "-" ? currentVal - props.amount : currentVal + props.amount;

    nextValue = Math.round(nextValue * 100) / 100;

    if (mode === "-") {
        if (isAtMinValue.value) return;
        updateGlobal(props.settingName, nextValue);
    } else {
        if (isAtMaxValue.value) return;
        updateGlobal(props.settingName, nextValue);
    }
}

function startHold(mode: "+" | "-") {
    updateSize(mode);

    holdTimer = setTimeout(() => {
        repeatInterval = setInterval(() => {
            updateSize(mode);
        }, 80);
    }, 400);
}

function stopHold() {
    if (holdTimer) clearTimeout(holdTimer);
    if (repeatInterval) clearInterval(repeatInterval);
}
</script>

<template>
    <div class="option setting">
        <div class="option-title">
            <slot name="icon"></slot>
            <p>{{ optionTitle }}</p>
        </div>
        <div class="increase-option">
            <button
                class="settings-btn default-color increase-decrease"
                @click.prevent="updateSize('-')"
                @mousedown="startHold('-')"
                @mouseup="stopHold"
                @mouseleave="stopHold"
                @touchstart.prevent="startHold('-')"
                @touchend="stopHold"
            >
                <Icon name="lucide:minus" />
            </button>

            <div>
                <span>{{ currentSize }}</span>
            </div>

            <button
                class="settings-btn default-color increase-decrease"
                @click.prevent="updateSize('+')"
                @mousedown="startHold('+')"
                @mouseup="stopHold"
                @mouseleave="stopHold"
                @touchstart.prevent="startHold('+')"
                @touchend="stopHold"
            >
                <Icon name="lucide:plus" />
            </button>
        </div>
    </div>
</template>
