# Hướng dẫn Chức năng Điểm thưởng và Hệ thống Hạng (Ranking System)

Tài liệu này giải thích cách hoạt động của hệ thống tích điểm và thăng hạng thành viên trên nền tảng GearXpert.

## 1. Cơ chế tích lũy điểm thưởng

Điểm thưởng được cộng tự động vào tài khoản của khách hàng khi một đơn hàng thuê thiết bị hoàn tất thành công.

*   **Thời điểm cộng điểm**: Ngay khi đơn hàng chuyển sang trạng thái `COMPLETED` (sau khi đã thu hồi thiết bị và quyết toán tiền thuê/cọc).
*   **Công thức tính**: `10,000 VND = 100 điểm` (tương đương 100 VND = 1 điểm).
*   **Giá trị tính điểm**: Điểm được tính dựa trên **Tổng tiền thuê thực tế** (Rent Amount). Không tính trên tiền cọc (Deposit) vì đây là khoản tiền được hoàn lại.

*Ví dụ: Khách hàng thuê thiết bị với tổng tiền thuê là 1,500,000 VND. Sau khi hoàn tất đơn hàng, khách hàng sẽ nhận được: 1,500,000 / 100 = 15,000 điểm.*

## 2. Hệ thống Hạng thành viên (Ranks)

Dựa trên tổng số điểm tích lũy (`rewardPoints`), người dùng sẽ được phân vào các hạng thành viên khác nhau. Mỗi hạng sẽ có những đặc quyền và voucher riêng.

| Hạng | Điểm yêu cầu (Min Points) | Mô tả |
| :--- | :--- | :--- |
| **BRONZE** | 0 | Hạng mặc định khi mới đăng ký tài khoản. |
| **SILVER** | 1,000 | Đạt được khi tích lũy đủ 1,000 điểm. |
| **GOLD** | 5,000 | Đạt được khi tích lũy đủ 5,000 điểm. |
| **PLATINUM** | 10,000 | Đạt được khi tích lũy đủ 10,000 điểm. |
| **DIAMOND** | 20,000 | Hạng cao nhất với nhiều ưu đãi đặc biệt nhất. |

## 3. Quy trình Thăng hạng tự động

Hệ thống sẽ thực hiện kiểm tra và thăng hạng theo các bước sau:
1.  Đơn hàng được xác nhận hoàn tất bởi Staff/Admin (`confirm-return`).
2.  Backend tính toán số điểm mới dựa trên giá trị đơn hàng.
3.  Cập nhật tổng điểm vào tài khoản User trong cơ sở dữ liệu.
4.  So sánh tổng điểm với các ngưỡng (Thresholds) để xác định hạng mới.
5.  Nếu đạt ngưỡng mới, trường `rank` của User sẽ được cập nhật.
6.  **Thông báo**: Hệ thống gửi thông báo (Notification) kèm số điểm nhận được và lời chúc mừng thăng hạng đến khách hàng.

## 4. Đặc quyền theo hạng

Khách hàng ở hạng càng cao sẽ nhận được các quyền lợi:
*   **Voucher độc quyền**: Truy cập được các mã giảm giá dành riêng cho hạng (ví dụ: GOLD10, PLAT15).
*   **Độ ưu tiên**: Được ưu tiên hỗ trợ và tham gia các sự kiện đặc biệt.
*   **Uy tín**: Hiển thị huy hiệu hạng (Badge) và màu sắc đặc trưng trong trang cá nhân.

## 5. Lưu ý cho Quản trị viên/Nhà phát triển

*   **Logic Backend**: Hàm xử lý chính là `updatePointsAndRank` nằm trong file `controllers/Rental/RentalController.js`.
*   **Dữ liệu**: Điểm và hạng được lưu trữ trực tiếp trong model `User`.
*   **Đồng bộ**: Các ngưỡng điểm trong backend cần khớp với cấu hình hiển thị tại trang `RankPage.js` trên Frontend để đảm bảo trải nghiệm người dùng nhất quán.
