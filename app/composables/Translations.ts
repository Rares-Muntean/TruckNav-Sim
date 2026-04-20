import de from "~/locales/de.json";
import en from "~/locales/en.json";

export type LocaleCode = "en" | "de";

type TranslationTree = typeof en;

const STORAGE_KEY = "truck-nav-locale";
const dictionaries: Record<LocaleCode, TranslationTree> = { en, de };

function readValue(tree: TranslationTree, path: string): string | undefined {
    return path.split(".").reduce<unknown>((current, segment) => {
        if (
            current &&
            typeof current === "object" &&
            segment in current
        ) {
            return (current as Record<string, unknown>)[segment];
        }

        return undefined;
    }, tree) as string | undefined;
}

export const useTranslations = () => {
    const locale = useState<LocaleCode>("truck-nav-locale", () => "en");

    const setLocale = (nextLocale: LocaleCode) => {
        locale.value = nextLocale;

        if (import.meta.client) {
            localStorage.setItem(STORAGE_KEY, nextLocale);
        }
    };

    const initLocale = () => {
        if (!import.meta.client) return;

        const savedLocale = localStorage.getItem(STORAGE_KEY);

        if (savedLocale === "en" || savedLocale === "de") {
            locale.value = savedLocale;
            return;
        }

        locale.value = "en";
    };

    const t = (path: string) => {
        return (
            readValue(dictionaries[locale.value], path) ??
            readValue(dictionaries.en, path) ??
            path
        );
    };

    return {
        locale,
        setLocale,
        initLocale,
        t,
    };
};
