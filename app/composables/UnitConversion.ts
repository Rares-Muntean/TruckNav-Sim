export const useUnitConversion = () => {
    const { activeSettings } = useSettings();

    const kmToUserUnits = (value: number | null | undefined) => {
        if (value == null) return 0;
        return activeSettings.value.units === "metric"
            ? value
            : value * 0.621371;
    };

    const literToUserUnits = (value: number | null | undefined) => {
        if (value == null) return 0;
        return activeSettings.value.units === "metric"
            ? value
            : value * 0.264172;
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

    return {
        kmToUserUnits,
        literToUserUnits,
        speedUnit,
        distanceUnit,
        fuelUnit,
    };
};
