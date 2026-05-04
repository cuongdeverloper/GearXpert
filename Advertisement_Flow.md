# 📢 Hướng Dẫn Luồng Hoạt Động: Hệ Thống Quảng Cáo (Advertisements)

Tài liệu này giải thích chi tiết cách thức hoạt động của hệ thống chạy quảng cáo (Banner & Popup) trên GearXpert, đặc biệt là các luồng tài chính (trừ tiền/hoàn tiền) liên quan đến Ví (Wallet).

---

## 🏗️ 1. Sơ đồ trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant Supplier as 🏪 Supplier
    participant FE as 🎨 Frontend
    participant BE as ⚙️ Backend
    participant Wallet as 💳 Ví (Wallet)
    participant Admin as 👑 Admin

    Note over Supplier, Wallet: BƯỚC 1: TẠO CHIẾN DỊCH & THANH TOÁN TOÀN BỘ
    Supplier->>FE: Điền form quảng cáo (Ngân sách, Ngày, Hình ảnh)
    FE->>BE: POST /advertisements (Create)
    BE->>BE: Tính tổng chi phí = Ngân sách x Số ngày x Hệ số (Loại QC)
    BE->>Wallet: Trừ TOÀN BỘ chi phí từ Ví & Tạo Transaction
    Wallet-->>BE: Success
    BE->>DB: Lưu Advertisement (status = PENDING, paidAmount = totalCost)
    BE-->>FE: Thông báo chờ duyệt

    Note over BE, Admin: BƯỚC 2: KIỂM DUYỆT (ADMIN REVIEW)
    Admin->>BE: Cập nhật trạng thái (APPROVED / REJECTED)
    alt Nếu REJECTED (Chưa chạy)
        BE->>Wallet: Hoàn 100% paidAmount
        Wallet-->>BE: Success
    end
    alt Nếu REJECTED (Đang chạy)
        BE->>BE: Tính số ngày đã chạy thực tế
        BE->>Wallet: Hoàn tiền các ngày chưa sử dụng
        Wallet-->>BE: Success
    end
    BE->>DB: Cập nhật status

    Note over Supplier, FE: BƯỚC 3: HIỂN THỊ (DISPLAY)
    FE->>BE: GET /banners hoặc /popups
    BE->>DB: Tìm Ads (APPROVED + Đang trong thời hạn)
    DB-->>BE: Danh sách Ads (Sắp xếp ưu tiên theo Ngân sách giảm dần)
    BE-->>FE: Hiển thị Ads cho khách hàng

    Note over Supplier, Wallet: BƯỚC 4: HỦY QUẢNG CÁO & HOÀN TIỀN (SỚM)
    Supplier->>FE: Bấm "Xóa quảng cáo"
    FE->>BE: DELETE /advertisements/:id
    BE->>BE: Tính toán số tiền đã tiêu (UsedDays x effectiveDailyBudget)
    alt Nếu (paidAmount > Số tiền đã tiêu)
        BE->>Wallet: Hoàn lại phần tiền chênh lệch
    end
    BE->>DB: Xóa bản ghi Quảng cáo
    BE-->>FE: Thông báo hủy thành công (kèm số tiền hoàn)
```

---

## 📦 2. Cách thức Truyền xuất Dữ liệu (Data Definition)

Các trường dữ liệu quan trọng trong Model `Advertisement`:

| Trường (Field) | Loại (Type) | Ý nghĩa & Logic |
| :--- | :--- | :--- |
| `adsType` | `Array` | Loại quảng cáo: `BANNER`, `POPUP` hoặc cả hai. **(Lưu ý: Nếu chọn cả 2, chi phí nhân đôi).** |
| `dailyBudget` | `Number` | Ngân sách ngày. **Cố định 4 mức: 50k, 100k, 200k, 500k.** |
| `totalCost` | `Number` | Tổng chi phí dự kiến cho toàn bộ chiến dịch. |
| `paidAmount` | `Number` | Số tiền Supplier thực tế **đã bị trừ khỏi ví** lúc tạo đơn (= `totalCost`, thu toàn bộ trước). |
| `status` | `String` | Trạng thái: `PENDING` (Chờ duyệt), `APPROVED` (Đang chạy), `REJECTED` (Bị từ chối), `EXPIRED` (Hết hạn). |

---

## 🛠️ 3. Quy trình Xử lý Logic & Tài Chính

### A. Logic Tính Phí & Thu Tiền (Thanh toán toàn bộ trước)
- **Chi phí thực tế (Effective Budget):** Nếu Supplier chọn cả 2 loại `[BANNER, POPUP]`, ngân sách ngày sẽ bị **nhân 2**.
- **Tính tổng ngày (DiffDays):** Tính cả ngày bắt đầu và ngày kết thúc (`End - Start + 1`).
- **Mức ngân sách cố định:** Hệ thống giới hạn 4 mức chi tiêu để phân cấp ưu tiên: 50.000 (Đồng), 100.000 (Bạc), 200.000 (Vàng), 500.000 (Kim cương). Ô nhập liệu bị khóa, Supplier chỉ được phép chọn.
- **Thu toàn bộ chi phí:** Khi tạo Ads, Backend thu **100% `totalCost`** ngay lập tức từ Ví. Điều này đảm bảo không xảy ra thất thoát doanh thu.
  👉 Ví dụ: Chạy 10 ngày, mức Kim cương 500k/ngày (Tổng = 5 triệu). BE sẽ trừ luôn `5.000.000đ` từ Ví.
- **Ví không đủ tiền:** Trả về mã lỗi HTTP 400 (Custom `errorCode: 2`), thông báo cho Supplier đi nạp thêm tiền.
- **Chính sách hoàn tiền:** Nếu Supplier hủy sớm, hệ thống sẽ **tự động tính số ngày đã chạy** và hoàn lại tiền cho các ngày chưa sử dụng.

### B. Logic Kiểm Duyệt & Từ chối (Refund)
- Nếu Admin chọn **APPROVED**: Quảng cáo sẽ nằm chờ đến đúng `startDate` để tự động lên sóng.
- Nếu Admin chọn **REJECTED**:
  - **Đang `PENDING` hoặc chưa tới `startDate`:** Hoàn **100%** `paidAmount`.
  - **Đang `APPROVED` và đã chạy:** Tính số ngày thực tế đã chạy (`UsedDays`), tính chi phí đã tiêu (`CostOfUsedDays = UsedDays × effectiveDailyBudget`), hoàn lại phần tiền dư (`paidAmount - CostOfUsedDays`).

### C. Logic Hiển thị (Thuật toán Trọng số - Weighted Appearance)
Để đảm bảo tính công bằng và minh bạch giữa các Supplier có cùng mức chi tiêu, hệ thống áp dụng thuật toán ngẫu nhiên có trọng số thay vì sắp xếp cố định:

1. **Bảng điểm Trọng số (Weights):**
   - **Kim cương (500k):** 50 điểm (~50% cơ hội xuất hiện).
   - **Vàng (200k):** 25 điểm (~25% cơ hội xuất hiện).
   - **Bạc (100k):** 15 điểm (~15% cơ hội xuất hiện).
   - **Đồng (50k):** 10 điểm (~10% cơ hội xuất hiện).

2. **Cách thức Hiển thị:**
   - **Với Popup:** Áp dụng **Weighted Random**. Hệ thống bốc thăm 1 quảng cáo duy nhất dựa trên tổng điểm trọng số của tất cả Ads đang chạy. Ai chi nhiều hơn (Kim cương) có xác suất "trúng thưởng" cao hơn.
   - **Với Banner:** Áp dụng **Weighted Shuffle**. Hệ thống trộn toàn bộ danh sách quảng cáo nhưng vị trí (Slide 1, 2, 3...) được quyết định dựa trên trọng số. Quảng cáo Kim cương có xác suất cực cao đứng ở Slide 1, đảm bảo quyền lợi vị trí đắc địa.
   - **Cùng mức chi:** Các quảng cáo có cùng mức chi tiêu (ví dụ cùng là gói Vàng) sẽ có tỉ lệ xuất hiện ngang nhau tại mọi phiên làm việc.

### D. Logic Hủy Sớm (Xóa Quảng Cáo) & Công thức Hoàn Tiền
Supplier có thể tự hủy quảng cáo bất cứ lúc nào. Khi đó, thuật toán **hoàn tiền** hoạt động như sau:
1. Nếu đang `PENDING` hoặc **Chưa tới ngày bắt đầu**: Hoàn 100% `paidAmount`.
2. Nếu **Đang chạy**: 
   - `UsedDays = floor((Now - StartDate) / 1 ngày) + 1`
   - `CostOfUsedDays = UsedDays × effectiveDailyBudget`
   - `RefundAmount = paidAmount - CostOfUsedDays`
   - Nếu `RefundAmount > 0`: Hoàn lại phần tiền dư.
   - Nếu `RefundAmount <= 0`: **Không hoàn tiền.** (Đã chạy hết ngân sách).
   
   👉 **Ví dụ thực tế:** Đăng quảng cáo 30 ngày, ngân sách 10k/ngày (tổng = 300k). Hủy vào ngày thứ 29:
   - `UsedDays = 29`, `CostOfUsedDays = 29 × 10.000 = 290.000đ`
   - `RefundAmount = 300.000 - 290.000 = 10.000đ` → Hoàn lại **10.000đ** (1 ngày chưa dùng).
