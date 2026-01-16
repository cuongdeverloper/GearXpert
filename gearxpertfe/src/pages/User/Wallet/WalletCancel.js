import { XCircle } from "lucide-react";

export default function WalletCancel() {
  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <XCircle size={80} color="red" />
      <h2>Thanh toán đã bị huỷ</h2>
      <p>Bạn có thể thử lại bất cứ lúc nào</p>
    </div>
  );
}
