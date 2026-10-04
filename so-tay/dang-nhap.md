# Đăng nhập · nhúng Sheet (iframe)

| Phép thử | Kết quả |
|---|---|
| D1a Chrome thường, đã đăng nhập Gmail được chia sẻ | ✅ Nhúng `…/edit?authuser=<gmail>` sửa được |
| D1b Chrome **ẩn danh**, file riêng tư | ❌ Khung chỉ báo "Cho phép Google Trang tính truy cập cookie"; bấm xong vẫn "Không thể truy cập Tài khoản Google" |
| D1c Chrome ẩn danh, file **công khai** | ✅ Nhúng được và **sửa được** (C1 đạt) |
| D2 Nút "Đăng nhập Google" | ⚠ Ô email **trống**; đăng nhập xong về **trang chỉnh sửa Sheet**, không về trang nhúng |
| D3 Chia sẻ `sendNotificationEmail:false` | ✅ Hộp thư Gmail được chia sẻ **không có thư** nào |
| D4 Hai Gmail cùng đơn vị | ✅ Cả hai sửa được, thấy nội dung nhau, lịch sử ghi đúng người |

### Iframe Sheet riêng tư cần cookie bên thứ ba
**Triệu chứng** · khung nhúng không hiện Sheet, chỉ hiện "Cho phép cookie".
**Nguyên nhân** · Chrome ẩn danh (và người tắt cookie bên thứ ba) chặn cookie
Google trong iframe. **Cách đúng** · app phải cảnh báo, kèm nút **"Mở sheet
trong tab mới"** (không phụ thuộc cookie bên thứ ba) làm đường dự phòng.

### Nút "Đăng nhập Google" không điền sẵn email, không quay về app
**Cách đúng** · mở trang Google ở tab mới, ghi rõ Gmail cần dùng trên nút;
người dùng đăng nhập xong thì quay lại tab app bấm "Tôi đã đăng nhập" để nạp
lại khung nhúng (đừng trông chờ Google tự quay về).
