<script lang="ts" setup>
const { settings, updateGlobal } = useSettings();

type globalKeys = keyof Omit<AppSettingsState, "profiles">;

let holdTimer: ReturnType<typeof setTimeout> | null = null;
let repeatInterval: ReturnType<typeof setInterval> | null = null;

const props = defineProps<{
    optionTitle: string;
    iconName: string;
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
    if (mode === "-") {
        if (isAtMinValue.value) return;
        updateGlobal(
            props.settingName,
            (settings.value[props.settingName] as number) - props.amount,
        );
    } else {
        if (isAtMaxValue.value) return;
        updateGlobal(
            props.settingName,
            (settings.value[props.settingName] as number) + props.amount,
        );
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
            <Icon :name="iconName" size="24" />
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
