# 💡 Gợi ý Tính năng Mới cho GearXpert

> Dựa trên phân tích toàn bộ kiến trúc: 42 models, 23 controllers, 16 trang Admin, 19 trang Supplier, 5 Scheduled Jobs, hệ thống Rank, Wallet, SmartGear, Quảng cáo, Blog, Chat real-time, eKYC, Bảo hiểm, và hơn 40 màn hình Frontend.

---

## 🔴 Ưu tiên Cao — Lỗ hổng nghiệp vụ rõ ràng

### 1. Lịch sử điểm thưởng (Reward Points History)
**Vấn đề:** Hệ thống hiện có `rewardPoints` nhưng người dùng không thể xem HỌLẤY điểm từ đơn nào, bao giờ, bao nhiêu.

**Giải pháp:**
- Thêm model `PointTransaction` (userId, amount, type: EARN/REDEEM, source: rentalId, description, createdAt)
- Mỗi khi `confirmReturn` cộng điểm → lưu 1 bản ghi vào `PointTransaction`
- Hiển thị timeline lịch sử điểm trong trang `/rank`

---

### 2. Đổi điểm lấy Voucher (Points Redemption)
**Vấn đề:** Hệ thống có Rank/Points nhưng chưa có cơ chế "tiêu điểm" — điểm tích lũy xong không dùng được gì ngoài việc lên rank.

**Giải pháp:**
- Thêm loại voucher `POINTS_REWARD` trong Voucher model
- Trang Rank có mục "Đổi điểm" — ví dụ 500 điểm = voucher giảm 50k
- Backend kiểm tra số điểm, trừ điểm, tạo voucher cá nhân hóa

---

### 3. Thông báo hết hạn Voucher
**Vấn đề:** `Voucher` model có `expiredAt` nhưng không có job nhắc nhở user trước khi voucher hết hạn.

**Giải pháp:**
- Thêm job cron chạy hàng ngày: quét voucher sắp hết hạn (còn ≤ 3 ngày)
- Push notification cho user đang giữ voucher đó
- Tương tự như `rentalDueReminders.js` đã có

---

### 4. So sánh thiết bị nâng cao
**Vấn đề:** FE có nút "So sánh" (balance icon) trong `ProductCard` nhưng chức năng compare chưa đầy đủ — thiếu bảng so sánh specs side-by-side theo danh mục.

**Giải pháp:**
- Trang `/compare?ids=...` hiển thị bảng so sánh ngang: giá/ngày, rating, specs, tồn kho, nhà cung cấp
- Highlight điểm khác biệt giữa các thiết bị

---

## 🟡 Ưu tiên Trung bình — Nâng cao trải nghiệm

### 5. Hệ thống Referral (Giới thiệu bạn bè)
**Vì sao phù hợp:** Hệ thống đã có Rank + Points + Voucher — referral là bước tự nhiên tiếp theo.

**Giải pháp:**
- Thêm `referralCode` (unique) vào User model
- Khi bạn bè đăng ký bằng referral code và hoàn thành đơn thuê đầu tiên → cả 2 được cộng điểm
- Hiển thị mã giới thiệu + thống kê trong ProfilePage

---

### 6. Gói thuê theo bộ (Bundle Rental)
**Vì sao phù hợp:** SmartGear đã có concept `requiredCategories` (ví dụ: "Bộ quay phim = máy ảnh + đèn + mic"). Nhưng hiện tại user vẫn phải add từng cái một.

**Giải pháp:**
- Trang SmartGear → nút "Thuê cả bộ" → tự động thêm toàn bộ thiết bị recommend vào giỏ
- Giảm giá combo 5-10% khi thuê theo bộ SmartGear
- Supplier có thể tạo Bundle riêng cho shop của họ

---

### 7. Lịch bận của Thiết bị (Availability Calendar nâng cao)
**Vì sao phù hợp:** `occupiedDates` đã được tính toán trong `getDeviceDetail` nhưng FE chưa khai thác hết.

**Giải pháp:**
- Hiển thị calendar trực quan trên trang chi tiết thiết bị: ngày bận màu đỏ, ngày rảnh màu xanh
- Cho phép user chọn ngày ngay trên calendar thay vì dùng date picker rời rạc

---

### 8. Supplier Analytics Dashboard nâng cao
**Vì sao phù hợp:** `SupplierRevenue.js` (12KB) khá nhỏ, trong khi dữ liệu thuê rất phong phú.

**Gợi ý thêm vào dashboard:**
- Thiết bị cho thuê nhiều nhất / ít nhất
- Khung giờ/ngày trong tuần được đặt nhiều
- Tỉ lệ hoàn thành đơn vs hủy
- Customer quay lại (retention rate)
- So sánh doanh thu tháng này vs tháng trước

---

### 9. Chương trình Khách hàng Thân thiết cho Supplier
**Vì sao phù hợp:** Hiện có `StoreFollow` model — user đã theo dõi supplier, nhưng chưa có cơ chế rewarding cho loyalty đó.

**Giải pháp:**
- Supplier có thể tạo "Ưu đãi thành viên" cho người đã theo dõi shop ≥ N ngày
- Sau X lần thuê từ cùng 1 supplier → tự động nhận voucher từ supplier đó
- Hiển thị badge "Khách quen" trên trang shop

---

## 🟢 Ưu tiên Thấp — Nice-to-have

### 10. Đánh giá Supplier bởi Admin sau sự cố
**Vì sao phù hợp:** Có `DamageReport`, `ShopReport`, `DeliveryIssueReport` — nhưng chưa có cơ chế hạ điểm uy tín tự động.

**Giải pháp:**
- Supplier score tự động giảm khi có nhiều report không giải quyết
- Admin có thể xem "Supplier Health Score" trên trang quản lý

---

### 11. Widget Giá theo Mùa / Sự kiện
**Vì sao phù hợp:** Giá thiết bị hiện cố định. Nhiều thiết bị như máy quay, đèn sẽ có nhu cầu cao vào dịp lễ, tết, mùa cưới.

**Giải pháp:**
- Supplier cài đặt "Giá theo mùa" (ví dụ: tháng 12 + 20%)
- Hệ thống tự áp dụng khi tính giá thuê
- Thêm trường `seasonalPricing: [{ startDate, endDate, multiplier }]` vào Device model

---

### 12. Smart Notifications (Gợi ý thông minh)
**Vì sao phù hợp:** Hệ thống AI SmartGear đã có, cộng với lịch sử thuê của từng user.

**Giải pháp:**
- Gửi notification: "Thiết bị bạn yêu thích vừa có hàng trở lại"
- "Giá thiết bị X giảm 15% so với lần bạn xem"
- "Bạn thường thuê vào tháng này — đặt trước ngay!"

---

### 13. Xem trước hợp đồng ngay trên UI
**Vì sao phù hợp:** `templatesContract/` đã có templates hợp đồng, nhưng user thường chỉ thấy sau khi đã đặt đơn.

**Giải pháp:**
- Thêm nút "Xem hợp đồng mẫu" trên trang chi tiết thiết bị
- Modal hiển thị preview PDF hợp đồng điền sẵn một phần (tên thiết bị, giá, điều khoản)
- Tăng độ tin tưởng cho người dùng mới

---

## 📊 Tóm tắt

| # | Tính năng | Ưu tiên | Độ phức tạp | Impact |
|---|-----------|---------|-------------|--------|
| 1 | Lịch sử điểm thưởng | 🔴 Cao | Thấp | ⭐⭐⭐⭐ |
| 2 | Đổi điểm lấy Voucher | 🔴 Cao | Trung bình | ⭐⭐⭐⭐⭐ |
| 3 | Thông báo hết hạn Voucher | 🔴 Cao | Thấp | ⭐⭐⭐ |
| 4 | So sánh thiết bị nâng cao | 🔴 Cao | Trung bình | ⭐⭐⭐⭐ |
| 5 | Hệ thống Referral | 🟡 TB | Trung bình | ⭐⭐⭐⭐⭐ |
| 6 | Bundle Rental (SmartGear) | 🟡 TB | Cao | ⭐⭐⭐⭐ |
| 7 | Calendar tồn kho nâng cao | 🟡 TB | Trung bình | ⭐⭐⭐ |
| 8 | Supplier Analytics nâng cao | 🟡 TB | Trung bình | ⭐⭐⭐ |
| 9 | Loyalty Supplier Program | 🟡 TB | Cao | ⭐⭐⭐⭐ |
| 10 | Supplier Health Score | 🟢 Thấp | Cao | ⭐⭐⭐ |
| 11 | Giá theo Mùa | 🟢 Thấp | Cao | ⭐⭐⭐ |
| 12 | Smart Notifications | 🟢 Thấp | Cao | ⭐⭐⭐⭐ |
| 13 | Preview Hợp đồng | 🟢 Thấp | Thấp | ⭐⭐⭐ |
