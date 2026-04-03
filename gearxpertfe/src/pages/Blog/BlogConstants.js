export const CATEGORY_MAP = {
    CAMERA: { label: "Máy ảnh", color: "bg-primary" },
    DRONE: { label: "Drone", color: "bg-primary" },
    LIGHTING: { label: "Ánh sáng", color: "bg-amber-500" },
    AI_TECH: { label: "Công nghệ AI", color: "bg-accent-cyan" },
    AUDIO: { label: "Thiết bị âm thanh", color: "bg-primary" },
    CINEMATOGRAPHY: { label: "Quay phim điện ảnh", color: "bg-violet-500" },
    ACCESSORIES: { label: "Phụ kiện", color: "bg-primary" },
    INDUSTRY_NEWS: { label: "Tin tức ngành", color: "bg-slate-800" },
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
