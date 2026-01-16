import { CheckCircle } from "lucide-react";

export default function WalletSuccess() {
  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <CheckCircle size={80} color="green" />
      <h2>Thanh toán thành công 🎉</h2>
      <p>Tiền sẽ được cộng vào ví trong giây lát</p>
    </div>
  );
}
