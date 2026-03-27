import { useI18n } from "../../i18n/I18nContext";

export default function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage } = useI18n();

  return (
    <div
      className={`inline-flex items-center rounded-2xl border border-slate-200 bg-white/80 backdrop-blur px-1 py-1 ${className}`}
      role="group"
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => setLanguage("vi")}
        className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
          language === "vi" ? "bg-primary text-white shadow" : "text-slate-600 hover:bg-slate-100"
        }`}
        aria-pressed={language === "vi"}
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
          language === "en" ? "bg-primary text-white shadow" : "text-slate-600 hover:bg-slate-100"
        }`}
        aria-pressed={language === "en"}
      >
        EN
      </button>
    </div>
  );
}

