// helpers.js
export const getDaysRemaining = (endDateStr) => {
    if (!endDateStr) return 999;
    const end = new Date(endDateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  export const getDueStatus = (days) => {
    if (days < 0) return { label: `Quá hạn ${Math.abs(days)} ngày`, color: "red" };
    if (days === 0) return { label: "Hôm nay phải trả", color: "red" };
    if (days === 1) return { label: "Còn 1 ngày", color: "orange" };
    if (days <= 3) return { label: `Còn ${days} ngày`, color: "amber" };
    return null;
  };