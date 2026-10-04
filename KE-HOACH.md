# KẾ HOẠCH

*Cập nhật: 04/10/2026 13:30*

> **Đã chốt 04/10/2026 10:19** (thay chốt 05:42): làm **một phương án đăng nhập**
> — chọn đơn vị → nhập Gmail được cấp quyền → vào app; Google tự lo phần mật
> khẩu (`KIEN-TRUC.md` mục 4). Bỏ OAuth Client ID. **C giữ lại** thành tùy
> chọn "bảng công khai — nhập không cần đăng nhập", làm sau b06.
> Lĩnh vực làm trước: **Bồi thường, hỗ trợ, tái định cư (BTTĐC)**. Các hướng đã
> bàn và bỏ: form do GAS vẽ / nhúng web app GAS; Google Sites làm app nhập.
>
> **Đã chốt 04/10/2026 13:30:** mỗi bảng một file cho mỗi đơn vị · cột A = Mã
> đơn vị · tab kỳ tên `dd.mm.yyyy` · khoá theo cài đặt từng bảng · mẫu ưu tiên
> dựng trên app, Excel tải lên phải qua kiểm hợp lệ (thiết kế mục 5, 5.1).

**Đang làm:** *(trống — AI nhận bước thì ghi `<tên AI> · bxx · từ dd/mm/yyyy HH:mm`, kết thúc phiên thì xoá; luật ở `AGENTS.md` mục 0)*

> Chỉ ghi việc **chưa xong**. Xong thì xoá dòng đó — việc đã làm nằm ở `../nhatky/`.

## Đang chờ chủ dự án

- Không có.

## Các bước

| Bước | Việc | Điểm dừng |
|---|---|---|
| **b04** | Dựng lại BTTĐC theo quy ước mới (mã `thu-nghiem/gas-thu/B03.js`): 2 bảng → 2 file con cho Ban thử; cột A = Mã đơn vị (chèn vào mẫu); tab `dd.mm.yyyy`; khoá theo cài đặt ở tab *Bảng* của Sheet quản lý (cột nhập, dòng nhập/khoá, cho thêm dòng, tab chú thích kèm) — khoá chỉ theo khai báo, không dò công thức. Làm phép thử **T5** (bảng Khó khăn cho thêm dòng) | Gmail thử: bảng Dự án như b03; bảng Khó khăn chèn được dòng, cột công thức/cột A vẫn khoá |
| **b05** | Màn hình đăng nhập + màn hình nhập (pptx trang 2–3) | Gmail thử đăng nhập, thấy Sheet đơn vị mình |
| **b06** | Trang quản trị (pptx trang 4): kỳ báo cáo, tài khoản, phân quyền, bảng; **dựng bảng mẫu trên app** + kiểm Excel tải lên | Chia nhỏ sau b05 |
| **b07** | Bảng công khai (C): phép thử C1–C4 rồi tùy chọn "không cần đăng nhập" | `so-tay/chia-se-cong-khai.md` có kết quả |

## Việc treo

- File tổng BTTĐC: dự án có dự án thành phần bị **cộng hai lần** ở các dòng SUM
  tab Tổng hợp (dòng cha = tổng dòng con). Đề xuất chỉ cộng dòng không phải
  dòng cha — làm ở bước tổng hợp.
- Bảng thứ 3 "Tiến độ giải ngân vốn đầu tư công": chủ dự án đưa sau, dùng để
  thử tính năng **thêm bảng mới**.
- 3 file thử b03 (`*_thu`) còn trên Drive; b04 dọn bằng `b03_don` rồi dựng lại.
