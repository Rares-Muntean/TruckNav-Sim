import { computed } from "vue"
import { useSettings } from "~/composables/Settings"

const { settings } = useSettings()

export const useConversions = () => {
    const kmToUserUnits = (value: number | null | undefined) => {
        if (value == null) return 0
        return settings.value.units === "metric"
            ? value
            : value * 0.621371
        }
    
        const literToUserUnits = (value: number | null | undefined) => {
        if (value == null) return 0
        return settings.value.units === "metric"
            ? value 
            : value * 0.264172
    }
    
    const speedUnit = computed(() =>
        settings.value.units === "metric" ? "km/h" : "mph"
    )

    const distanceUnit = computed(() =>
        settings.value.units === "metric" ? "km" : "mi"
    )

    const fuelUnit = computed(() =>
        settings.value.units === "metric" ? "L" : "gal"
    )

    return {
        kmToUserUnits,
        literToUserUnits,
        speedUnit,
        distanceUnit,
        fuelUnit,
    };
}