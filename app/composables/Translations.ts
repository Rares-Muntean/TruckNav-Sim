import de from "~/locales/de.json";
import en from "~/locales/en.json";
// New Language for NL By Mambu
import nl from "~/locales/nl.json";

type TranslationTree = typeof en;

// New Language for NL By Mambu
const dictionaries: Record<LocaleCode, TranslationTree> = { en, de, nl };

function readValue(tree: TranslationTree, path: string): string | undefined {
    return path.split(".").reduce<unknown>((current, segment) => {
        if (current && typeof current === "object" && segment in current) {
            return (current as Record<string, unknown>)[segment];
        }

        return undefined;
    }, tree) as string | undefined;
}

export const useTranslations = () => {
    const { settings, updateGlobal } = useSettings();

    const locale = computed(() => settings.value.locale);

    const setLocale = (nextLocale: LocaleCode) => {
        updateGlobal("locale", nextLocale);
    };

    const t = (path: string) => {
        const currentDict = dictionaries[locale.value] || dictionaries.en;
        return (
            readValue(currentDict, path) ??
            readValue(dictionaries.en, path) ??
            path
        );
    };

    return {
        locale,
        setLocale,
        t,
    };
};
