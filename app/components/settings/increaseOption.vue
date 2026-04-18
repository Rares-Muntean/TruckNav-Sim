<script lang="ts" setup>
const { settings, updateGlobal } = useSettings();

type globalKeys = keyof Omit<AppSettingsState, "profiles">;

const props = defineProps<{
    optionTitle: string;
    iconName: string;
    settingName: globalKeys;

    maxValue: number;
    minValue: number;

    amount: number;
}>();

const currentSize = computed(() => settings.value.hudBtnSize);

const isAtMaxValue = computed(
    () => settings.value.hudBtnSize >= props.maxValue,
);
const isAtMinValue = computed(
    () => settings.value.hudBtnSize <= props.minValue,
);

function updateSize(mode: "+" | "-") {
    if (mode === "-") {
        if (isAtMinValue.value) return;
        updateGlobal(
            props.settingName,
            settings.value.hudBtnSize - props.amount,
        );
    } else {
        if (isAtMaxValue.value) return;
        updateGlobal(
            props.settingName,
            settings.value.hudBtnSize + props.amount,
        );
    }
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
                @click.prevent="updateSize('-')"
                class="settings-btn default-color increase-decrease"
            >
                <Icon name="lucide:minus" />
            </button>

            <div>
                <span>{{ currentSize }}</span>
            </div>

            <button
                @click.prevent="updateSize('+')"
                class="settings-btn default-color increase-decrease"
            >
                <Icon name="lucide:plus" />
            </button>
        </div>
    </div>
</template>
