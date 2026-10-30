export const useUnitConversion = () => {
    const { activeSettings } = useSettings();

    const kmToUserUnits = (value: number | null | undefined) => {
        if (value == null) return 0;
        return activeSettings.value.units === "metric"
            ? value
            : Math.round(value * 0.621371);
    };

    const literToUserUnits = (value: number | null | undefined) => {
        if (value == null) return 0;
        return activeSettings.value.units === "metric"
            ? value
            : Math.round(value * 0.264172);
    };

    const kgToUserUnits = (value: number | null | undefined) => {
        if (value == null) return 0;
        return activeSettings.value.units === "metric"
            ? Math.round(value / 1000)
            : Math.round(value * 2.20462);
    };

    const formatConsumption = (rawLitersPerKm: number | null | undefined) => {
        if (!rawLitersPerKm || rawLitersPerKm <= 0) {
            return activeSettings.value.units === "metric" ? "0" : "0.0";
        }

        if (activeSettings.value.units === "metric") {
            return Math.round(rawLitersPerKm * 100).toString();
        } else {
            return (2.35215 / rawLitersPerKm).toFixed(1);
        }
    };

    const speedUnit = computed(() =>
        activeSettings.value.units === "metric" ? "km/h" : "mph",
    );

    const distanceUnit = computed(() =>
        activeSettings.value.units === "metric" ? "km" : "mi",
    );

    const fuelUnit = computed(() =>
        activeSettings.value.units === "metric" ? "L" : "gal",
    );

    const weightUnit = computed(() =>
        activeSettings.value.units === "metric" ? "t" : "lbs",
    );
    const consumptionUnit = computed(() =>
        activeSettings.value.units === "metric" ? "L/100" : "mpg",
    );

    return {
        kmToUserUnits,
        literToUserUnits,
        formatConsumption,
        kgToUserUnits,
        speedUnit,
        distanceUnit,
        fuelUnit,
        consumptionUnit,
        weightUnit,
    };
};
