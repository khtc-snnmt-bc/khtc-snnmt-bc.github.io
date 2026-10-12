// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-ban-do.mjs
// Vai trò  : Kiểm hàm thuần lĩnh vực Bản đồ phía GAS: quyền một Gmail, gộp tài khoản các lĩnh vực,
//            giữ cột Chặn khi lưu Gmail ở trang Quản trị
// Chạy     : node app/kiem-thu/kiem-gas-ban-do.mjs
// Phiên bản: 0.1.0 · Cập nhật: 12/10/2026 23:55
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('DangNhap.js') + '\n' + doc('QuanTri.js') + '\n' + doc('PhanQuyen.js') + '\n' + doc('BanDo.js') +
  '\n;this.ham = { chuanHoaGmail_, quyenBanDo_, gopTaiKhoanLinhVuc_, thayTaiKhoanDonVi_ };', sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

const tk = [
  ['email', 'unitCode', 'role', 'Chặn'],
  ['qt@gmail.com', 'KH', 'Quản trị', true],
  ['a.b@gmail.com', 'BT', 'Nhập liệu', false],
  ['c@gmail.com', 'KH', 'Nhập liệu', ''],
  ['c@gmail.com', 'BT', 'Nhập liệu', 'TRUE'],
  ['d@gmail.com', 'XA', 'Nhập liệu', ''],
];
const dv = [
  ['unitCode', 'unitName', 'region', 'role', 'manageTables', 'Ảnh vệ tinh'],
  ['KH', 'Phòng KHTC', '', 'Quản trị', '', true],
  ['BT', 'Phòng BTTĐC', '', 'Đơn vị báo cáo', '', false],
  ['XA', 'Xã A', '', 'Đơn vị báo cáo', '', ''],
];

bai('chuanHoaGmail_: như Worker', () => {
  assert.equal(h.chuanHoaGmail_(' Trong.Dung+abc@GoogleMail.com '), 'trongdung@gmail.com');
  assert.equal(h.chuanHoaGmail_('a.b@so.gov.vn'), 'a.b@so.gov.vn');
});

bai('quyenBanDo_: có trong Tài khoản = Nội bộ; Chặn ở bất kỳ dòng nào = không; Quản trị luôn được cả hai', () => {
  assert.deepEqual(sach(h.quyenBanDo_(tk, dv, 'AB@gmail.com')), { noiBo: true, veTinh: false });
  assert.deepEqual(sach(h.quyenBanDo_(tk, dv, 'c@gmail.com')), { noiBo: false, veTinh: false }, 'bị chặn');
  assert.deepEqual(sach(h.quyenBanDo_(tk, dv, 'qt@gmail.com')), { noiBo: true, veTinh: true }, 'quản trị bỏ qua Chặn');
  assert.deepEqual(sach(h.quyenBanDo_(tk, dv, 'd@gmail.com')), { noiBo: true, veTinh: false });
  assert.deepEqual(sach(h.quyenBanDo_(tk, dv, 'x@gmail.com')), { noiBo: false, veTinh: false });
  assert.deepEqual(sach(h.quyenBanDo_(tk, dv, '')), { noiBo: false, veTinh: false });
  const dv2 = dv.map((r, i) => (i === 3 ? r.slice(0, 5).concat([true]) : r));
  assert.deepEqual(sach(h.quyenBanDo_(tk, dv2, 'd@gmail.com')), { noiBo: true, veTinh: true }, 'đơn vị tích Ảnh vệ tinh');
  // Sheet chưa có cột Chặn / Ảnh vệ tinh
  const tk3 = tk.map((r) => r.slice(0, 3));
  assert.deepEqual(sach(h.quyenBanDo_(tk3, [dv[0].slice(0, 4)], 'c@gmail.com')), { noiBo: true, veTinh: false });
});

bai('gopTaiKhoanLinhVuc_: trùng tên hoàn toàn = một đơn vị; Gmail đã có không thêm; mã trùng khác tên thì thêm đuôi', () => {
  const nguon = [
    { ma: 'BTTDC', donVi: [dv[0], ['KHTC.SNNMT', 'Phòng KHTC', '', 'Quản trị'], ['BT', 'Phòng BT khác tên', '', ''],
      ['MOI', 'Đơn vị mới', 'KV1', 'Quản lý báo cáo']],
      taiKhoan: [tk[0], ['QT@gmail.com', 'KHTC.SNNMT', 'Quản trị'], ['e@gmail.com', 'KHTC.SNNMT', 'Quản trị'],
        ['f@gmail.com', 'BT', 'Nhập liệu'], ['g@gmail.com', 'MOI', 'Nhập liệu'], ['h@gmail.com', 'KHONG_CO', '']] },
    { ma: 'BCXA', donVi: [dv[0], ['XA1', 'Đơn vị mới', '', ''], ['BT', 'Phòng BT khác tên 2', '', '']],
      taiKhoan: [tk[0], ['G@gmail.com', 'XA1', ''], ['i@gmail.com', 'XA1', '']] },
  ];
  const kq = sach(h.gopTaiKhoanLinhVuc_(dv, tk, nguon));
  assert.deepEqual(kq.donViMoi, [
    ['BT.BTTDC', 'Phòng BT khác tên', '', 'Đơn vị báo cáo'],
    ['MOI', 'Đơn vị mới', 'KV1', 'Đơn vị báo cáo'],
    ['BT.BCXA', 'Phòng BT khác tên 2', '', 'Đơn vị báo cáo'],
  ]);
  assert.deepEqual(kq.taiKhoanMoi, [
    ['e@gmail.com', 'KH', 'Nhập liệu'],
    ['f@gmail.com', 'BT.BTTDC', 'Nhập liệu'],
    ['g@gmail.com', 'MOI', 'Nhập liệu'],
    ['i@gmail.com', 'MOI', 'Nhập liệu'],
  ]);
  // chạy lại trên kết quả đã gộp → không thêm gì
  const dvSau = dv.concat(kq.donViMoi), tkSau = tk.concat(kq.taiKhoanMoi);
  assert.deepEqual(sach(h.gopTaiKhoanLinhVuc_(dvSau, tkSau, nguon)), { donViMoi: [], taiKhoanMoi: [] });
});

bai('thayTaiKhoanDonVi_: cột Chặn đi theo Gmail, không lệch dòng', () => {
  const dong = sach(h.thayTaiKhoanDonVi_(tk, 'KH', [{ email: 'c@gmail.com', role: 'Nhập liệu' }, { email: 'moi@gmail.com', role: 'Nhập liệu' }]));
  assert.deepEqual(dong, [
    ['a.b@gmail.com', 'BT', 'Nhập liệu', false],
    ['c@gmail.com', 'BT', 'Nhập liệu', 'TRUE'],
    ['d@gmail.com', 'XA', 'Nhập liệu', ''],
    ['c@gmail.com', 'KH', 'Nhập liệu', ''],
    ['moi@gmail.com', 'KH', 'Nhập liệu', ''],
  ]);
});

console.log('ĐẠT ' + soBai + ' bài — kiem-gas-ban-do');
