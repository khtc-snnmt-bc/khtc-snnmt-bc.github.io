# Công cụ: gh · git · clasp

### `gh auth login` treo vì đòi bấm phím
**Triệu chứng** · lệnh chờ nhập, AI không trả lời được.
**Nguyên nhân** · chế độ hỏi-đáp. **Cách đúng** · chạy NỀN
`gh auth login --web --hostname github.com --git-protocol https --skip-ssh-key`,
đọc mã 8 ký tự trong output, đưa chủ dự án dán ở github.com/login/device; xong
chạy `gh auth setup-git`. `gh auth status` xem tài khoản nào đang active.

### Đẩy repo báo không có quyền
**Triệu chứng** · `viewerPermission: READ`. **Nguyên nhân** · `gh` đang active
nhầm tài khoản. **Cách đúng** · `gh auth switch` sang tài khoản đẩy (tên ở
`AGENTS.md` mục 4), kiểm bằng `gh repo view <repo> --json viewerPermission`.
