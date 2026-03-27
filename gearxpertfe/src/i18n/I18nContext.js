import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import vi from "./locales/vi";
import en from "./locales/en";

const STORAGE_KEY = "gearxpert.lang";
const SUPPORTED_LANGUAGES = ["vi", "en"];

const dictionaries = { vi, en };

const I18nContext = createContext({
  language: "vi",
  locale: "vi-VN",
  setLanguage: () => {},
  t: (key) => key,
  text: (viText, enText) => viText ?? enText ?? "",
});

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
};

const interpolate = (template, params) => {
  if (typeof template !== "string") return template;
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    params[k] === undefined || params[k] === null ? "" : String(params[k])
  );
};

export function I18nProvider({ children, defaultLanguage = "vi" }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
    } catch {
      // ignore
    }
    return SUPPORTED_LANGUAGES.includes(defaultLanguage) ? defaultLanguage : "vi";
  });

  const setLanguage = useCallback((lang) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const locale = language === "en" ? "en-US" : "vi-VN";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key, params) => {
      const value =
        getByPath(dictionaries[language], key) ??
        getByPath(dictionaries.vi, key) ??
        key;
      return interpolate(value, params);
    },
    [language]
  );

  const text = useCallback(
    (viTextOrMap, enText) => {
      const viText =
        typeof viTextOrMap === "object" && viTextOrMap
          ? viTextOrMap.vi
          : viTextOrMap;
      const enValue =
        typeof viTextOrMap === "object" && viTextOrMap
          ? viTextOrMap.en
          : enText;

      if (language === "en") return enValue ?? viText ?? "";
      return viText ?? enValue ?? "";
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({ language, locale, setLanguage, t, text }),
    [language, locale, setLanguage, t, text]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
