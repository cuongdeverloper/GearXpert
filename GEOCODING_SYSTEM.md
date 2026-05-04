# Hướng dẫn Chức năng Geocoding (Mã hóa địa chỉ)

Tài liệu này giải thích cách hệ thống GearXpert chuyển đổi địa chỉ văn bản thành tọa độ (Kinh độ/Vĩ độ) và ngược lại để phục vụ hiển thị bản đồ.

## 1. Công nghệ sử dụng
Hệ thống sử dụng **Mapbox Geocoding API (v5)** để thực hiện các tác vụ xử lý vị trí.
*   **Thư viện Frontend**: `react-map-gl/mapbox`
*   **CSS**: `mapbox-gl/dist/mapbox-gl.css`
*   **Token**: Được lưu trong biến môi trường `REACT_APP_MAPBOX_ACCESS_TOKEN`.

## 2. Các cơ chế hoạt động chính

### A. Forward Geocoding (Địa chỉ văn bản -> Tọa độ)
Được kích hoạt khi người dùng nhập dữ liệu vào các trường: Số nhà/Đường, Quận, Thành phố.

*   **Logic**: Hệ thống sẽ ghép các trường thông tin thành một chuỗi địa chỉ đầy đủ (ví dụ: `123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng, Việt Nam`).
*   **Debouncing**: Để tối ưu hiệu năng và tiết kiệm lượt gọi API, hệ thống đợi **800ms** sau khi người dùng ngừng gõ mới bắt đầu gửi yêu cầu.
*   **Location Bias**: Các kết quả tìm kiếm được ưu tiên trong khu vực Đà Nẵng bằng cách sử dụng tham số `bbox` (Bounding Box).
*   **Độ tin cậy (Relevance)**: Hệ thống kiểm tra tham số `relevance` từ API. Nếu kết quả có độ tin cậy thấp (< 0.8), một cảnh báo sẽ hiển thị trên bản đồ.

### B. Reverse Geocoding (Tọa độ -> Địa chỉ văn bản)
Được kích hoạt khi người dùng nhấn vào nút **"Định vị tôi"** (Locate Me).

*   **Bước 1**: Sử dụng Geolocation API của trình duyệt để lấy tọa độ hiện tại của thiết bị.
*   **Bước 2**: Gửi tọa độ này lên Mapbox API để lấy về các thông tin như Tên đường, Phường/Xã, Quận/Huyện.
*   **Bước 3**: Tự động điền (Auto-fill) các thông tin này vào form để người dùng kiểm tra lại.

### C. Manual Pinning (Ghim thủ công)
Cho phép người dùng trực tiếp nhấn lên bản đồ để chọn vị trí chính xác nhất.

*   Khi người dùng click lên bản đồ, hệ thống sẽ ưu tiên tọa độ này và **tạm dừng** việc tự động geocode theo văn bản để tránh làm mất vị trí khách đã chọn.
*   Người dùng có thể nhấn nút "Reset" để quay lại chế độ tự động theo địa chỉ text.

## 3. Cấu trúc dữ liệu
Trong Database (`SupplierProfile` model), thông tin địa chỉ được lưu dưới dạng:

```json
"warehouseAddress": {
    "street": "123 Nguyễn Văn Linh",
    "district": "Hải Châu",
    "city": "Đà Nẵng",
    "fullAddress": "...",
    "lat": 16.0544,
    "lng": 108.2022
}
```

## 4. Lưu ý cho nhà phát triển
*   **API Limits**: Cần theo dõi lượng request đến Mapbox API để tránh vượt quá hạn mức miễn phí.
*   **Độ chính xác**: Việc Geocoding phụ thuộc vào dữ liệu của Mapbox. Khuyến khích người dùng kiểm tra lại Marker trên bản đồ sau khi nhập địa chỉ.
*   **Quyền truy cập**: Tính năng "Định vị" yêu cầu người dùng phải cấp quyền truy cập Location trên trình duyệt.

## 5. Vị trí mã nguồn
*   **Frontend Logic**: `gearxpertfe/src/pages/Supplier/SupplierProfileEdit.js` (Hàm `geocodeAddress`, `handleLocateMe`, `handleMapClick`).
*   **Backend Storage**: `gearxpertbe/controllers/Supplier/SupplierController.js` (Hàm `updateSupplierProfile`).
