// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-dang-nhap.mjs
// Vai trò  : Kiểm thử các hàm thuần xử lý đăng nhập phía GAS bằng Node.js
// Chạy     : node app/kiem-thu/kiem-gas-dang-nhap.mjs
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 13:33
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ma = readFileSync(new URL('../gas/DangNhap.js', import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(ma + '\n;this.ham = { kiemTraTaiKhoan_, layTenDonVi_, ghepDanhSachBang_, layEmailCuaDonVi_, timDonViTheoEmail_, chonDonViTheoEmail_ };', sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) {
  fn();
  soBai++;
}

// Dữ liệu mẫu giả lập Sheet Quản lý
const mauTaiKhoan = [
  ['email', 'unitCode', 'role'],
  ['thu1@example.com', 'BQLDA.BinhThoi', 'Nhập liệu'],
  ['admin@snnmt.gov.vn', 'KHTC.SNNMT', 'Quản trị']
];

const mauDonVi = [
  ['unitCode', 'unitName', 'region', 'role'],
  ['BQLDA.BinhThoi', 'Ban QLDA ĐTXD phường Bình Thới', 'Khu vực 1', 'Đơn vị báo cáo'],
  ['KHTC.SNNMT', 'Phòng Kế hoạch – Tài chính', '', 'Quản trị']
];

const mauBang = [
  ['tableCode', 'tableName', 'group', 'periodType'],
  ['bttdc_duan', 'Tiến độ BTTĐC các dự án', 'BTTDC', 'thang'],
  ['bttdc_khokhan', 'Khó khăn – Kiến nghị', 'BTTDC', 'thang']
];

const mauFile = [
  ['unitCode', 'tableCode', 'fileId', 'createdAt'],
  ['BQLDA.BinhThoi', 'bttdc_duan', 'id_file_duan_binhthoi', '2026-10-04'],
  ['BQLDA.BinhThoi', 'bttdc_khokhan', 'id_file_khokhan_binhthoi', '2026-10-04'],
  ['BQLDA.Khac', 'bttdc_duan', 'id_file_khac', '2026-10-04']
];

// 1. Kiểm tra tài khoản
bai('Kiểm tra quyền tài khoản đúng', () => {
  const kq = h.kiemTraTaiKhoan_(mauTaiKhoan, 'thu1@example.com', 'BQLDA.BinhThoi');
  assert.equal(kq.hopLe, true);
  assert.equal(kq.role, 'Nhập liệu');

  // Thử viết hoa email / đơn vị
  const kqHoa = h.kiemTraTaiKhoan_(mauTaiKhoan, 'THU1@EXAMPLE.COM ', 'BQLDA.BinhThoi ');
  assert.equal(kqHoa.hopLe, true);
});

bai('Kiểm tra tài khoản sai bị từ chối', () => {
  const kqSaiEmail = h.kiemTraTaiKhoan_(mauTaiKhoan, 'nguoila@gmail.com', 'BQLDA.BinhThoi');
  assert.equal(kqSaiEmail.hopLe, false);

  const kqSaiDonVi = h.kiemTraTaiKhoan_(mauTaiKhoan, 'thu1@example.com', 'BQLDA.Khac');
  assert.equal(kqSaiDonVi.hopLe, false);
  assert.match(kqSaiDonVi.loi, /không thuộc đơn vị đã chọn/);
  assert.match(kqSaiEmail.loi, /chưa được cấp quyền/);

  const kqRong = h.kiemTraTaiKhoan_(mauTaiKhoan, '', '');
  assert.equal(kqRong.hopLe, false);
});

// 2. Lấy tên đơn vị
bai('Lấy tên đơn vị chuẩn', () => {
  assert.equal(h.layTenDonVi_(mauDonVi, 'BQLDA.BinhThoi'), 'Ban QLDA ĐTXD phường Bình Thới');
  assert.equal(h.layTenDonVi_(mauDonVi, 'MA_CHUA_CO'), 'MA_CHUA_CO');
});

// 3. Ghép danh sách bảng và fileId
bai('Ghép danh sách bảng theo đơn vị', () => {
  const ds = h.ghepDanhSachBang_(mauBang, mauFile, 'BQLDA.BinhThoi');
  assert.equal(ds.length, 2);
  assert.deepEqual(sach(ds[0]), {
    tableCode: 'bttdc_duan',
    tableName: 'Tiến độ BTTĐC các dự án',
    group: 'BTTDC',
    periodType: 'thang',
    fileId: 'id_file_duan_binhthoi'
  });
  assert.deepEqual(sach(ds[1]), {
    tableCode: 'bttdc_khokhan',
    tableName: 'Khó khăn – Kiến nghị',
    group: 'BTTDC',
    periodType: 'thang',
    fileId: 'id_file_khokhan_binhthoi'
  });

  // Đơn vị khác
  const dsKhac = h.ghepDanhSachBang_(mauBang, mauFile, 'BQLDA.Khac');
  assert.equal(dsKhac.length, 1);
  assert.equal(dsKhac[0].fileId, 'id_file_khac');

  // Đơn vị không có file
  const dsRong = h.ghepDanhSachBang_(mauBang, mauFile, 'KHONG_CO');
  assert.equal(dsRong.length, 0);
});

// 4. Tài khoản theo đơn vị · đơn vị theo Gmail (hai chiều của màn hình đăng nhập)
bai('Chỉ trả Gmail của đúng một đơn vị', () => {
  const tk = [
    ['email', 'unitCode', 'role'],
    ['A@gmail.com', 'BQLDA.BinhThoi', 'Nhập liệu'],
    ['b@gmail.com', 'BQLDA.BinhThoi', 'Nhập liệu'],
    ['b@gmail.com', 'BQLDA.BinhThoi', 'Nhập liệu'],
    ['c@gmail.com', 'KHTC.SNNMT', 'Quản trị']
  ];
  assert.deepEqual(sach(h.layEmailCuaDonVi_(tk, 'BQLDA.BinhThoi')), ['a@gmail.com', 'b@gmail.com']);
  assert.deepEqual(sach(h.layEmailCuaDonVi_(tk, '')), []);
  assert.deepEqual(sach(h.layEmailCuaDonVi_(tk, 'KHONG_CO')), []);
});

bai('Tìm đơn vị theo Gmail gõ đủ, không khớp một phần', () => {
  const tk = [
    ['email', 'unitCode', 'role'],
    ['a@gmail.com', 'BQLDA.BinhThoi', 'Nhập liệu'],
    ['a@gmail.com', 'KHTC.SNNMT', 'Quản trị']
  ];
  const kq = sach(h.timDonViTheoEmail_(tk, mauDonVi, ' A@Gmail.com '));
  assert.equal(kq.length, 2);
  assert.equal(kq[0].unitName, 'Ban QLDA ĐTXD phường Bình Thới');
  assert.deepEqual(sach(h.timDonViTheoEmail_(tk, mauDonVi, 'a@gmail')), []);
  assert.deepEqual(sach(h.timDonViTheoEmail_(tk, mauDonVi, '')), []);
});

bai('Đăng nhập chưa chọn đơn vị: suy đơn vị từ Gmail', () => {
  assert.equal(h.chonDonViTheoEmail_(mauTaiKhoan, mauDonVi, ' THU1@example.com').unitCode, 'BQLDA.BinhThoi');
  const khongCo = sach(h.chonDonViTheoEmail_(mauTaiKhoan, mauDonVi, 'nguoila@gmail.com'));
  assert.equal(khongCo.unitCode, undefined);
  assert.ok(khongCo.loi);
  const tk = [
    ['email', 'unitCode', 'role'],
    ['a@gmail.com', 'BQLDA.BinhThoi', 'Nhập liệu'],
    ['a@gmail.com', 'KHTC.SNNMT', 'Quản trị']
  ];
  const nhieu = sach(h.chonDonViTheoEmail_(tk, mauDonVi, 'a@gmail.com'));
  assert.equal(nhieu.unitCode, undefined);
  assert.equal(nhieu.donVi.length, 2);
});

console.log('kiem-gas-dang-nhap: ' + soBai + ' bài ĐẠT!');
