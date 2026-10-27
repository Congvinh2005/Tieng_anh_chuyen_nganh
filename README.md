# 🎓 EIT Cram - Ôn Thi Tiếng Anh Chuyên Ngành CNTT Cấp Tốc

> Ứng dụng web tương tác hỗ trợ ôn tập cấp tốc môn **Tiếng Anh Chuyên Ngành Công Nghệ Thông Tin**, được xây dựng dựa trên 100% dữ liệu từ đề cương và đáp án cuối kỳ:
> - **Phần I**: 48 Thuật ngữ & Định nghĩa (kèm bản dịch nghĩa tiếng Việt).
> - **Phần II**: 50 Câu điền từ vào chỗ trống (kèm câu hoàn chỉnh & gợi ý).
> - **Phần III**: 50 Câu phán đoán Đúng / Sai (kèm giải thích chi tiết các câu Sai).
> - **Sổ tay**: Tra cứu toàn bộ 148 câu hỏi và xuất file PDF.

---

## 🚀 Hướng Dẫn Cách Chạy Dự Án

Bạn có thể chạy dự án bằng một trong các cách cực kỳ đơn giản dưới đây:

### Cách 1: Mở trực tiếp (Nhanh nhất - Không cần cài đặt gì)
Ứng dụng được thiết kế hoàn toàn tĩnh và độc lập, bạn không cần cài thêm bất kỳ phần mềm hay môi trường nào:
1. Mở thư mục dự án: `/Users/vinhdv/Tai_lieu/Tiếng Anh chuyên ngành/Thi_tieng_anh/`
2. **Nhấp đúp chuột vào file `index.html`** (hoặc chuột phải vào `index.html` chọn *Open With* -> *Google Chrome* / *Safari* / *Microsoft Edge*).
3. Trang web sẽ mở ngay lập tức trên trình duyệt và bạn có thể bắt đầu ôn tập.

---

### Cách 2: Chạy bằng máy chủ cục bộ Python (Khuyên dùng)
Máy Mac và hầu hết máy tính đã cài sẵn Python. Cách này giúp tải trang mượt mà như một trang web thực thụ:

1. Mở ứng dụng **Terminal**.
2. Di chuyển đến thư mục dự án:
   ```bash
   cd "/Users/vinhdv/Tai_lieu/Tiếng Anh chuyên ngành/Thi_tieng_anh"
   ```
3. Khởi động máy chủ:
   ```bash
   python3 -m http.server 3000
   ```
4. Mở trình duyệt web và truy cập vào địa chỉ:
   👉 **http://localhost:3000** hoặc **http://127.0.0.1:3000**

*(Để dừng máy chủ, nhấn tổ hợp phím `Ctrl + C` trong cửa sổ Terminal).*

---

### Cách 3: Chạy bằng Node.js / npx (Nếu máy có Node.js)
Nếu bạn đã cài Node.js, bạn có thể chạy bằng `serve`:
```bash
cd "/Users/vinhdv/Tai_lieu/Tiếng Anh chuyên ngành/Thi_tieng_anh"
npx serve -l 3000
```
Sau đó truy cập **http://localhost:3000**.

---

### Cách 4: Ôn tập trên Điện thoại di động (Cùng mạng WiFi)
Nếu muốn nằm ôn bài trên điện thoại hoặc máy tính bảng:
1. Khởi động server ở máy tính như ở **Cách 2** hoặc **Cách 3**.
2. Kiểm tra địa chỉ IP nội bộ của máy tính (trên Mac: vào *Cài đặt hệ thống* -> *Wi-Fi* -> *Chi tiết*, ví dụ `192.168.1.15`).
3. Mở trình duyệt trên điện thoại và truy cập:
   👉 **http://192.168.1.15:3000** *(thay bằng IP thực tế của máy bạn)*.

---

## ⚡ Các Tính Năng Hỗ Trợ Ôn Thi Cấp Tốc

1. **3 Chế độ học linh hoạt**:
   - ⌨️ **Gõ Điền Từ (Type Mode)**: Tự gõ đáp án vào ô trống và nhấn `Enter` để kiểm tra. Hệ thống không phân biệt hoa thường và tự bỏ qua dấu chấm câu thừa.
   - 🔘 **Trắc Nghiệm 4 Đáp Án (Choice Mode)**: Tự động tạo 4 phương án ngẫu nhiên để luyện nhận diện nhanh (nhấn phím `1`, `2`, `3`, `4`).
   - 🃏 **Thẻ Ghi Nhớ (Flashcard 3D)**: Nhấn `Space` hoặc chạm màn hình để lật mặt sau xem đáp án và nghĩa tiếng Việt.
2. **Nút hỗ trợ nhanh**:
   - 💡 **Gợi Ý (Hint)** (Phím `H`): Hiển thị chữ cái đầu và số lượng ký tự của từ cần điền.
   - 👁️ **Xem Đáp Án** (Phím `R`): Hiển thị ngay đáp án đúng và câu hoàn chỉnh.
3. **Bản đồ câu hỏi (1 - 50)**:
   - Bấm nút **Danh Sách Câu** để xem toàn bộ 50 câu hỏi.
   - Màu sắc trực quan: Xanh (đã làm đúng), Đỏ (làm sai), Xám (chưa làm).
4. **Đánh dấu câu khó (Bookmark)**:
   - Nhấn phím `S` hoặc bấm biểu tượng ngôi sao để lưu lại câu hay quên.
   - Sử dụng bộ lọc *"Đã đánh dấu sao (⭐)"* để ôn lại những câu này trước khi đi ngủ.
5. **Đồng hồ đếm ngược 2 tiếng**:
   - Giúp duy trì sự tập trung và phân bổ thời gian ôn thi hợp lý.
6. **Sổ tay tra cứu toàn bộ**:
   - Ô tìm kiếm thông minh: gõ bất kỳ từ khóa nào (`database`, `cloud`, `protocol`...) để tra nhanh.
   - Nút **In / Lưu PDF** để in ra giấy hoặc đọc offline.
7. **Lưu tiến độ tự động**:
   - Toàn bộ kết quả làm bài được lưu an toàn trong trình duyệt (`localStorage`), tắt mở lại trang không bị mất.

---

## ⌨️ Bảng Phím Tắt Tối Ưu Tốc Độ

| Phím Tắt | Chức Năng |
| :---: | :--- |
| `Enter` | Kiểm tra câu trả lời / Chuyển sang câu tiếp theo |
| `→` | Chuyển sang câu tiếp theo |
| `←` | Quay lại câu phía trước |
| `H` | Mở gợi ý chữ cái đầu |
| `R` | Xem ngay đáp án |
| `S` | Đánh dấu sao câu khó để ôn lại |
| `1`, `2`, `3`, `4` | Chọn nhanh đáp án trong chế độ trắc nghiệm |
| `T` / `F` | Chọn Đúng (True) / Sai (False) trong Phần III |
| `Space` | Lật thẻ ghi nhớ (Flashcard) |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
Thi_tieng_anh/
├── index.html                  # Giao diện chính của ứng dụng web
├── style.css                   # Hệ thống kiểu dáng, hiệu ứng glassmorphism & responsive
├── app.js                      # Bộ điều khiển logic, chấm điểm, phím tắt, âm thanh
├── data.js                     # Toàn bộ 148 câu hỏi đã chuẩn hóa sẵn sàng cho web
├── study_data.json             # Dữ liệu JSON cấu trúc
├── extract_data.py             # Script trích xuất và đồng bộ dữ liệu từ DOCX
├── README.md                   # Hướng dẫn chi tiết cách chạy và sử dụng
├── Phiếu ôn tập cuối kỳ.docx   # File đề cương ôn tập gốc
└── Đáp án đề cương TACN.docx    # File đáp án đề cương gốc
```

---

*Chúc bạn có một buổi ôn thi hiệu quả và đạt điểm số tuyệt đối trong kỳ thi ngày mai!* 🚀
