import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop - Scroll to top of page when route changes
 * Fixes bug: links (e.g. Điều khoản sử dụng, Chính sách quyền riêng tư)
 * from middle/footer of policy pages don't scroll to top on navigation
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
