import i18next from "i18next";

export const CATEGORY_MAP = {
    CAMERA: { color: "bg-primary" },
    DRONE: { color: "bg-primary" },
    LIGHTING: { color: "bg-amber-500" },
    AI_TECH: { color: "bg-accent-cyan" },
    AUDIO: { color: "bg-primary" },
    CINEMATOGRAPHY: { color: "bg-violet-500" },
    ACCESSORIES: { color: "bg-primary" },
    INDUSTRY_NEWS: { color: "bg-slate-800" },
};

export const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const lang = i18next.language === "vi" ? "vi-VN" : "en-US";
    return d.toLocaleDateString(lang, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};
