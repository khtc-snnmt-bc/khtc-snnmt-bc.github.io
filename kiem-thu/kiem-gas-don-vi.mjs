// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-don-vi.mjs
// Vai trò  : Kiểm hàm thuần thêm đơn vị phía GAS (kiểm mã, trùng, vai trò) + gợi ý mã phía trình duyệt
// Chạy     : node app/kiem-thu/kiem-gas-don-vi.mjs
// Phiên bản: 0.1.0 · Cập nhật: 07/10/2026 12:30
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f, thu) => readFileSync(new URL('../' + thu + '/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('DonVi.js', 'gas') + '\n;this.ham = { kiemDonViMoi_ };', sandbox);
vm.runInContext(doc('bo-dau.js', 'js/utils') + '\n' + doc('phan-quyen.js', 'js/domains') + '\n;this.pq = PHAN_QUYEN;', sandbox);
const h = sandbox.ham, pq = sandbox.pq;
const sach = (x) => JSON.parse(JSON.stringify(x));

const GT = [
  ['unitCode', 'unitName', 'region', 'role'],
  ['BQLDA.BinhThoi', 'Ban QLDA ĐTXD phường Bình Thới', 'Khu vực 1', 'Đơn vị báo cáo'],
  ['KHTC.SNNMT', 'Phòng Kế hoạch – Tài chính', '', 'Quản trị']
];

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

bai('đơn vị hợp lệ: chuẩn hoá khoảng trắng, vai trò mặc định', () => {
  const kq = sach(h.kiemDonViMoi_(' TTQL.DuongThuy ', '  Trung tâm   QL Dương Thuỷ ', ' Khu vực 2 ', '', GT));
  assert.deepEqual(kq.donVi, { unitCode: 'TTQL.DuongThuy', unitName: 'Trung tâm QL Dương Thuỷ', region: 'Khu vực 2', role: 'Đơn vị báo cáo' });
});

bai('mã sai dạng / dành riêng / thiếu tên / sai vai trò', () => {
  assert.match(h.kiemDonViMoi_('Bình Thới', 'X', '', '', GT).loi, /không dấu/);
  assert.match(h.kiemDonViMoi_('A', 'X', '', '', GT).loi, /không dấu/);
  assert.match(h.kiemDonViMoi_('ALL', 'X', '', '', GT).loi, /all/);
  assert.match(h.kiemDonViMoi_('MA1', '  ', '', '', GT).loi, /tên/);
  assert.match(h.kiemDonViMoi_('MA1', 'X', '', 'Sếp', GT).loi, /Vai trò/);
});

bai('trùng mã (không phân biệt hoa thường) hoặc trùng tên', () => {
  assert.match(h.kiemDonViMoi_('khtc.snnmt', 'Tên khác', '', '', GT).loi, /đã có/);
  assert.match(h.kiemDonViMoi_('MA.MOI', 'phòng kế hoạch – tài chính', '', '', GT).loi, /đã có/);
});

bai('gợi ý mã từ tên (trình duyệt)', () => {
  assert.equal(pq.maDonViTuTen('Ban QLDA Bình Thới'), 'BanQldaBinhThoi');
  assert.equal(pq.maDonViTuTen('Đường Thuỷ'), 'DuongThuy');
  assert.equal(pq.maDonViTuTen(''), '');
});

console.log('kiem-gas-don-vi: ' + soBai + ' bài đạt');
