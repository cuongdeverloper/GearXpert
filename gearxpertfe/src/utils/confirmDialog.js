import Swal from "sweetalert2";

export const confirmDialog = ({
  title,
  text,
  icon = "question",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor,
  cancelColor,
}) => {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: confirmColor,
    cancelButtonColor: cancelColor,
  });
};
