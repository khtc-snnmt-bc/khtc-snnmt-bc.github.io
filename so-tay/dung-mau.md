# Dựng mẫu · tạo file Sheet bằng Apps Script

### Công thức ghi bằng Apps Script báo `#ERROR!`
**Triệu chứng** · `setFormula('=IFERROR(H4/G4,"")')` hiện `#ERROR!`.
**Nguyên nhân** · bảng tính vùng `vi_VN` (mặc định của Gmail tiếng Việt) dùng
`;` ngăn đối số, `,` là dấu thập phân — `setFormula` theo vùng của file.
**Cách đúng** · viết công thức với `;`, đổi sang `,` khi `getSpreadsheetLocale()` là `en…`.

### Chuyển mẫu xlsx thành Google Sheet
**Cách đúng** · `Drive.Files.create({mimeType: GOOGLE_SHEETS, parents}, blobXlsx)`
(dịch vụ nâng cao Drive v3) — giữ định dạng, ô gộp, danh sách chọn, công thức.
Rồi `sheet.copyTo(fileCon)` để nhân tab mẫu sang file đơn vị.

### Web app chưa nhận mã mới ngay sau `update-deployment`
**Triệu chứng** · gọi `/exec` vẫn chạy mã cũ (số dòng trong `stack` khớp file cũ).
**Cách đúng** · chờ ~1 phút rồi gọi lại; đừng sửa tiếp vì tưởng mã sai.

### `setFrozenColumns` lỗi "chỉ chứa một phần của ô hợp nhất"
**Cách đúng** · mẫu có ô gộp ngang (tiêu đề `B2:P2`) thì không cố định cột;
chỉ cố định dòng tới dòng tiêu đề.

### `Session.getEffectiveUser()` lỗi thiếu quyền `userinfo.email`
**Cách đúng** · khỏi thêm quyền: lấy email chủ bằng
`DriveApp.getFileById(id).getOwner().getEmail()` (quyền Drive đã có).
