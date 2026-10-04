# KIẾN TRÚC

*Cập nhật: 04/10/2026 13:30*

> Thiết kế nghiệp vụ + quyết định nền tảng: `../tai-lieu/thiet-ke-webapp-baocao.md`
> (của chủ dự án). File này **không chép lại** thiết kế — chỉ ghi điều kỹ thuật
> phải biết khi dựng: rủi ro, hạn mức, phép thử.

## 1. Nền tảng — đã chốt trong thiết kế

```
GitHub Pages (HTML/JS tĩnh)          Apps Script (chỉ trả JSON)
 ├─ đăng nhập (mục 4) ──────────fetch─► đăng nhập · phân quyền · tạo/tách file
 ├─ sidebar: biểu được giao            khoá kỳ · đồng bộ · tổng hợp
 └─ <iframe> Google Sheet thật        Sheet quản lý: Tài khoản · Danh mục
                                      · Phân quyền · Ánh xạ dòng · Nhật ký file
```

- GAS **không bao giờ trả HTML** (tránh thanh "do người dùng Apps Script tạo").
- POST gửi `Content-Type: text/plain` để tránh preflight CORS.
- GAS triển khai *Thực thi bằng: Tôi · Truy cập: Bất kỳ ai* → mọi lệnh chạy
  bằng tài khoản chủ, dùng chung **một** hạn mức (mục 3).

## 2. Rủi ro phải nói thẳng

| # | Điều | Hệ quả |
|---|---|---|
| R1 | **Loại Mời = hai lần đăng nhập.** Mật khẩu app chỉ mở sidebar; iframe dùng tài khoản Google **đang đăng nhập trong trình duyệt** | Chưa đăng nhập Google, hoặc đăng nhập Gmail khác → iframe báo "Cần quyền truy cập". Phải hướng dẫn người dùng |
| R2 | **Khoá kỳ loại Mời không gỡ quyền theo tab được** — Drive chỉ có quyền theo file (thiết kế mục 4.2 cũng ghi vậy) | **Đã chốt 03/10/2026:** khoá kỳ luôn bằng Protect sheet, cả hai loại |
| R4 | **Nháp/Đã gửi trong Sheet gốc**: người dùng sửa thẳng ô, kể cả cột trạng thái | Khoá dòng đã gửi phải bằng vùng bảo vệ theo dòng; số vùng tăng dần theo kỳ |
| R5 | **Mật khẩu quản trị**: GAS không có bcrypt | Băm SHA-256 + muối (`Utilities.computeDigest`); phiên = mã thẻ có hạn trong `CacheService` |

## 3. Hạn mức Gmail cá nhân *(tra trang quota Google 03/10/2026)*

| Hạn mức | Con số | Đụng vào việc gì |
|---|---|---|
| Người nhận email | 100/ngày | "Gửi lời mời" 168 đơn vị → **chia 2 ngày**. Thông báo chia sẻ Drive có tính không — chưa rõ |
| Bảng tính tạo mới | 250/ngày | Nhóm mới 168 file được; **2 nhóm/ngày thì không** |
| Thời gian một lần chạy | 6 phút | Tạo 168 file không xong một lần → chạy theo lô, ghi tiến độ, chạy tiếp |
| Trigger | 20/người/script | **Không** đặt `onEdit` cho từng file con → đồng bộ bằng quét theo lịch |
| Tổng thời gian trigger | 90 phút/ngày | Quét 168 file mỗi giờ là vượt → chỉ quét file có `getLastUpdated` mới |
| Chạy đồng thời | 30/người | 50 người cùng lúc dồn vào tài khoản chủ → **gọi GAS ít**: đăng nhập + lấy danh sách một lần, gõ số thì đi thẳng iframe, không qua GAS |

## 4. Đăng nhập *(chủ dự án chốt 04/10/2026 — bỏ OAuth; C giữ cho "bảng công khai", làm sau)*

**Mỗi đơn vị một file** cho mỗi nhóm lĩnh vực · mỗi kỳ một tab · **kết kỳ =
Protect tab (chỉ chủ sửa) + ẩn tab** · file chia sẻ Editor cho **các Gmail
của đơn vị** (một đơn vị nhiều Gmail), **không gửi thư**.

1. Chọn đơn vị (gõ lọc hoặc chọn nhanh danh sách bên trái — pptx trang 2).
2. Nhập Gmail → GAS kiểm Gmail có thuộc đơn vị không → trả danh sách bảng.
3. Mở giao diện nhập; iframe Sheet gắn `authuser=<gmail>`.
   - Trình duyệt **đã** đăng nhập Gmail đó → sửa được ngay.
   - **Chưa** → nút "Đăng nhập Google" mở trang **của Google ở tab mới**
     (phép thử b02: Google **không** điền sẵn Gmail, **không** quay về app) →
     ghi rõ Gmail cần dùng trên nút + nút "Tôi đã đăng nhập" nạp lại khung.
   - Chrome ẩn danh / chặn cookie bên thứ ba: iframe **không hiện** → nút
     "Mở sheet trong tab mới" làm đường dự phòng (`so-tay/dang-nhap.md`).

**App KHÔNG BAO GIỜ có ô nhập mật khẩu Gmail** — ô "mật khẩu" ở pptx thành
nút chuyển sang Google. Tự thu mật khẩu Gmail là sai luật Google và giống trang
lừa đảo.

⚠ Bước 2 chỉ là **chọn đúng người**, không phải xác minh: ai biết Gmail của
đơn vị khác sẽ thấy *tên bảng* của đơn vị đó. **Số liệu vẫn kín** vì Google
chỉ cho Gmail được chia sẻ mở file. ⚠ **Quản trị** (tạo file, chia quyền)
không được chỉ dựa vào Gmail → thêm **mật khẩu quản trị** (băm, cất trong
Script Properties). ⚠ **Ẩn tab chỉ là gọn mắt, không phải bảo mật** — người có
quyền sửa có thể bỏ ẩn; phép thử K2 kiểm điều này.

**Bảng công khai (C — làm sau):** tùy chọn theo bảng, nhập **không cần đăng
nhập**; file "Bất kỳ ai có link đều sửa được". ⚠ Link nằm trong `src` iframe,
F12 là thấy, chép gửi được; lịch sử ghi "Ẩn danh"; file giữ ID qua các kỳ nên
link đã lộ dùng mãi. Chỉ cho số liệu không nhạy cảm. Phép thử C1–C4 dưới đây.

## 5. Phép thử — làm TRƯỚC khi dựng (trên file thử, Gmail thử)

**Chung (K):**
- K1 Protect tab "chỉ chủ sửa" → người được mời / người ẩn danh **không sửa** được.
- K2 Tab vừa protect vừa ẩn → hai loại người trên **có bỏ ẩn được không**,
  có xem được nội dung không (menu Xem → Trang tính bị ẩn).
- K3 GAS `doPost` gọi từ trang tĩnh bằng `text/plain`; đo thời gian trả lời.

**Đăng nhập (D):**
- D1 iframe: Gmail được chia sẻ sửa được; Gmail khác / chưa đăng nhập bị chặn
  (Google hiện gì trong iframe); trình duyệt đăng nhập 2 Gmail + `authuser=`
  → mở đúng tài khoản; điện thoại.
- D2 Nút "Đăng nhập Google" điền sẵn Gmail, đăng nhập xong **quay về app**.
- D3 Chia sẻ bằng Drive API `sendNotificationEmail: false` → có quyền, không có thư.
- D4 Một file chia sẻ cho 2 Gmail cùng đơn vị → cả hai sửa được, lịch sử
  ghi đúng người.

**Bảng công khai (C) — khi làm tới:**
- C1 Trình duyệt chưa đăng nhập Google **sửa được** file công khai trong iframe trên Pages.
- C2 Chép link từ F12 sang trình duyệt khác → sửa được (xác nhận rủi ro).
- C3 GAS tắt chia sẻ công khai khi người dùng **đang mở** file → bị chặn ngay
  hay còn sửa tiếp được bao lâu.
- C4 Bật lại chia sẻ → link cũ sống lại.

**Sau đó:**
- **T3 Tách–gộp dòng:** tách 2 dòng sang file con, người dùng **chèn thêm dòng**
  ở file con, đồng bộ về vẫn đúng chỗ (mã định danh ẩn).
- **T5 Bảng cho thêm dòng:** protect cả tab thì chặn chèn dòng (b03). Thử chỉ
  protect dòng tiêu đề + cột A + cột công thức → đơn vị chèn dòng được không,
  công thức có tự chép xuống dòng mới không.
- **T4 Hạn mức:** `addEditor` có gửi email và có trừ hạn mức 100/ngày không;
  tạo 20 file theo lô có ngắt–chạy tiếp được không.

Kết quả ghi `so-tay/<chức-năng>.md`; điều gì lật đổ thiết kế thì báo chủ dự án.

## 6. Bảng mẫu · cài đặt bảng *(chốt 04/10/2026 — chi tiết: thiết kế mục 5, 5.1)*

Mỗi bảng một file cho mỗi đơn vị · cột A = Mã đơn vị · tab kỳ tên `dd.mm.yyyy` ·
khoá theo cài đặt bảng (cột nhập, dòng nhập/dòng khoá, cho thêm dòng, tab chú
thích kèm). Dòng ghi theo số dòng **của mẫu** → khi tách phải giữ ánh xạ dòng
mẫu ↔ dòng file đơn vị.

**Khoá chỉ theo khai báo dòng/cột**, không tự dò công thức (chủ dự án chốt
04/10/2026). Cài đặt áp lúc sinh tab kỳ — sửa mẫu sau đó thì tab đã sinh không
tự đổi.

**Cài đặt bảng lưu ở đâu** — **(a), chủ dự án chốt 04/10/2026**:

*Sheet quản lý* = **một** file chung của cả app (Đơn vị · Tài khoản · Bảng ·
File). *File tổng* = mỗi bảng một file (mẫu + số liệu gộp). Hai thứ khác nhau.

| | (a) Tab *Bảng* trong Sheet quản lý | (d) Tab cài đặt trong file tổng của bảng | (b) Tab ẩn trong từng file đơn vị | (c) Trong phần mềm (Script Properties / file cấu hình) |
|---|---|---|---|---|
| Đơn vị thấy được? | Không | Không — file tổng chỉ chủ mở | **Có** — tải Excel thấy tab ẩn (K2) | Không |
| Sửa một cài đặt | 1 dòng | 1 chỗ trong file tổng | 49–168 file, dễ lệch | (c1) chỉ qua mã · (c2) sửa mã + đẩy git công khai |
| Xem cài đặt mọi bảng một lượt | **Có** | Không — mở từng file tổng | Không | Khó |
| GAS đọc | 1 file | 1 file tổng / bảng | Từng file đơn vị | Nhanh nhất |
| Nằm cạnh mẫu | Không | **Có** — chép file tổng là mang theo | Có | Không |

Cài đặt không phải bí mật; cần một nguồn, xem được một lượt, GAS đọc một
file khi đăng nhập/tạo file → **(a)**. (d) cũng dùng được, hơn ở chỗ "đi cùng
mẫu", nhưng thua ở chỗ rải rác theo từng bảng.

## 7. Bố cục mã dự kiến *(tạo khi cần, đừng tạo thư mục rỗng trước)*

```
app/
├── index.html               ← một trang, cả người dùng lẫn admin
├── js/config · utils · services · domains · pages   (phân lớp: AGENTS.md mục 5)
├── gas/                     ← mã Apps Script, đẩy bằng clasp
└── kiem-thu/                ← bài kiểm hàm thuần, chạy bằng Node
```
