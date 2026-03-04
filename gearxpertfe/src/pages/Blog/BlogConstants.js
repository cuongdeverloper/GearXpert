export const CATEGORY_MAP = {
    CAMERA: { label: "Cameras", color: "bg-primary" },
    DRONE: { label: "Drones", color: "bg-primary" },
    LIGHTING: { label: "Lighting", color: "bg-amber-500" },
    AI_TECH: { label: "AI Tech", color: "bg-accent-cyan" },
    AUDIO: { label: "Audio Gear", color: "bg-primary" },
    CINEMATOGRAPHY: { label: "Cinematography", color: "bg-violet-500" },
    ACCESSORIES: { label: "Accessories", color: "bg-primary" },
    INDUSTRY_NEWS: { label: "Industry News", color: "bg-slate-800" },
};

export const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};
