import sys
import json
import urllib.request
import face_recognition
import numpy as np

def load_image_from_url(url):
    """
    Hàm tải ảnh từ URL và chuyển thành format mà face_recognition đọc được
    """
    try:
        # Tải ảnh từ URL Cloudinary về bộ nhớ
        with urllib.request.urlopen(url) as response:
            image_file = response
            # Load ảnh vào thư viện
            return face_recognition.load_image_file(image_file)
    except Exception as e:
        return None

def verify(cccd_url, selfie_url):
    try:
        # 1. Load ảnh từ URL
        img_cccd = load_image_from_url(cccd_url)
        img_selfie = load_image_from_url(selfie_url)

        if img_cccd is None:
            return {"success": False, "message": "Không thể tải ảnh CCCD từ Cloudinary"}
        if img_selfie is None:
            return {"success": False, "message": "Không thể tải ảnh Selfie từ Cloudinary"}

        # 2. Mã hóa khuôn mặt (Encoding)
        cccd_encs = face_recognition.face_encodings(img_cccd)
        selfie_encs = face_recognition.face_encodings(img_selfie)

        # Kiểm tra xem có tìm thấy mặt không
        if len(cccd_encs) == 0:
            return {"success": False, "message": "Lỗi: Không tìm thấy khuôn mặt trên CCCD"}
        if len(selfie_encs) == 0:
            return {"success": False, "message": "Lỗi: Không tìm thấy khuôn mặt trên ảnh Selfie"}

        # 3. So sánh
        # Tolerance 0.5: Mức an toàn
        match = face_recognition.compare_faces([cccd_encs[0]], selfie_encs[0], tolerance=0.5)
        distance = face_recognition.face_distance([cccd_encs[0]], selfie_encs[0])

        return {
            "success": bool(match[0]),
            "confidence": round((1 - distance[0]) * 100, 2), # Độ tin cậy %
            "message": "Xác thực thành công! Chính chủ." if match[0] else "Khuôn mặt không khớp!"
        }

    except Exception as e:
        return {"success": False, "message": f"System Error: {str(e)}"}

if __name__ == "__main__":
    # Nhận URL từ tham số dòng lệnh
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "message": "Thiếu tham số URL"}))
    else:
        # sys.argv[1] là cccdUrl, sys.argv[2] là selfieUrl
        result = verify(sys.argv[1], sys.argv[2])
        print(json.dumps(result))