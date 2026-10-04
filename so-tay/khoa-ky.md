# Khoá kỳ · Apps Script gọi từ trang tĩnh

| Phép thử | Kết quả |
|---|---|
| K1 Protect tab, người được mời | ✅ Tab khoá, người được mời không sửa được |
| K2 Protect + ẩn, người được mời | ✅ Menu *Xem → Trang tính ẩn → Hiện T09-2026* **bị xám**, không bỏ ẩn được |
| K1/K2 người ẩn danh (file công khai) | ⚠ Tải được file Excel **đủ các tab**, kể cả tab ẩn |
| K2 người được mời: tải Excel | ⚠ Tải được **đủ các tab**, kể cả tab ẩn |

### Khoá + ẩn tab chặn SỬA, không giữ kín
**Cách đúng** · kết kỳ = chống sửa/bỏ ẩn. Ai mở được file đều tải Excel đọc hết
tab — chấp nhận, vì mỗi file chỉ chứa dữ liệu của chính đơn vị đó; **không** để
dữ liệu đơn vị khác chung file. ⏳ Chưa thử: xoá tab khoá, chèn dòng/cột.
| K3 `fetch` POST `text/plain` tới web app GAS | ✅ chạy, không dính CORS; lỗi: xem dưới |

### K3 — thời gian và lỗi thoảng
**Số đo** · 5 lần liên tiếp từ trình duyệt: 3,5 s · 2,4 s · 2,1 s · **lỗi** · 9,9 s
(máy chủ chỉ mất 1–2 ms; đọc một file Sheet ~400 ms). **Lỗi** · lần 4 trả HTML
thay vì JSON (`Unexpected token '<'`). **Cách đúng** · mỗi lần gọi ≈ 2–3 s
(chủ yếu chuyển hướng của Google), thỉnh thoảng 10 s → app phải có vòng tải,
**thử lại 1–2 lần** khi không đọc được JSON, và gọi GAS càng ít càng tốt.

### `clasp` báo "Content directory is a symlink"
**Triệu chứng** · `clasp push` / `create-script` lỗi trong thư mục Dropbox, cả
đường dẫn tương đối lẫn `D:\`. **Cách đúng** · chép mã sang thư mục tạm ngoài
Dropbox (kèm `.clasp.json` tự viết tay `{"scriptId":…,"rootDir":"."}`) rồi
`clasp push --force --project <thư mục tạm>`.
