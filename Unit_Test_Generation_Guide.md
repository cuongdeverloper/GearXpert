# Unit Test Generation Rules for GearXpert

Sử dụng tài liệu này làm Prompt đầu vào để yêu cầu AI thực hiện viết Unit Test cho các chức năng trong dự án GearXpert.

### 1. Phân tích mã nguồn thực tế
- LUÔN LUÔN đọc file Controller/Logic thực tế trước khi viết test.
- Trích xuất chính xác logic `if...else`, các câu báo lỗi (`message`), và mã trạng thái HTTP (`200, 201, 400, 403, 404, 500`) từ code.

### 2. Định dạng bảng Unit Test (Markdown)
Bảng phải tuân thủ cấu trúc bài mẫu của dự án:
- Các cột: `UTCID01, UTCID02, ...` (Không được gộp cột như UTCID01-03).
- Sử dụng dấu **"O"** để đánh dấu các điều kiện áp dụng cho từng trường hợp kiểm thử. Không viết chữ vào các ô đánh dấu "O".

### 3. Các thành phần bắt buộc trong bảng:
- **Test Requirement**: Mô tả logic step-by-step (ví dụ: `User sends request → System validates X → If fail return 400 → If success update DB → Return 200`).
- **Input Data**: Liệt kê chi tiết các input thực tế (Params, Body, Auth User).
- **Confirm (System Response)**: 
    - Phải có dòng xác nhận cập nhật Database (Ví dụ: `DB: views +1`, `DB: record deleted`).
    - Phải ghi kèm **Message** thông báo thực tế của API (Ví dụ: `HTTP 400 + message 'Thiếu dữ liệu...'`).
- **Type (N/A/B)**:
    - **N (Normal)**: Luồng chạy đúng chuẩn.
    - **A (Abnormal)**: Các trường hợp lỗi ngoại lệ (400, 404, 500).
    - **B (Boundary)**: Các trường hợp biên (số lượng tối thiểu/tối đa, chuỗi cực dài, giá trị bằng 0, sai định dạng ID).

### 4. Quy ước ngôn ngữ
- Tiêu đề cột và khung bảng: Tiếng Anh.
- Nội dung mô tả chi tiết: Tiếng Việt.

---
*Tài liệu này giúp đảm bảo tính đồng nhất của tất cả các Unit Test trong dự án.*
