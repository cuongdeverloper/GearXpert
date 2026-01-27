import Cookies from "js-cookie";
import { persistor } from "../redux/store";
import { doLogout } from "../redux/action/userAction";

export const performLogout = async ({
  dispatch,
  navigate,
  socketConnection,
  toast,
  onDone,
}) => {
  try {
    if (socketConnection) {
      socketConnection.disconnect();
    }

    dispatch(doLogout());
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    await persistor.purge();

    if (toast?.success) {
      toast.success("Đăng xuất thành công");
    }

    if (onDone) {
      onDone();
    }

    if (navigate) {
      navigate("/signin");
    }
  } catch (error) {
    console.error("Logout error:", error);
    if (toast?.error) {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    }
    if (onDone) {
      onDone();
    }
  }
};
