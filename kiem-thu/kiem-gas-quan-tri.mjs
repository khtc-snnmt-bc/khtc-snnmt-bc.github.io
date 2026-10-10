// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-quan-tri.mjs
// Vai trò  : Kiểm hàm thuần mật khẩu / phiên quản trị phía GAS bằng Node
// Chạy     : node app/kiem-thu/kiem-gas-quan-tri.mjs
// Phiên bản: 0.2.0 · Cập nhật: 10/10/2026 16:10
// ============================================================
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('DangNhap.js') + '\n' + doc('QuanTri.js') +
  '\n;this.ham = { byteSangHex_, bamMatKhau_, chuanHoaMatKhau_, soSanhDeu_, laTaiKhoanQuanTri_, phienHopLe_ };', sandbox);
const h = sandbox.ham;
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

bai('byteSangHex_ đổi byte có dấu kiểu Apps Script', () => {
  const buf = createHash('sha256').update('abc').digest();
  const coDau = Array.from(buf, (b) => (b > 127 ? b - 256 : b));
  assert.equal(h.byteSangHex_(coDau), buf.toString('hex'));
  assert.equal(h.byteSangHex_([0, -1, 15, -128]), '00ff0f80');
});

bai('bamMatKhau_ đúng công thức lặp', () => {
  let mong = sha('muoi' + 'matkhau123');
  for (let i = 1; i < 3; i++) mong = sha('muoi' + mong);
  assert.equal(h.bamMatKhau_('muoi', 'matkhau123', 3, sha), mong);
  assert.notEqual(h.bamMatKhau_('muoi', 'matkhau123', 3, sha), h.bamMatKhau_('muoi2', 'matkhau123', 3, sha));
  assert.equal(h.bamMatKhau_('m', 'Mật khẩu có dấu', 1, sha), sha('mMật khẩu có dấu'));
});

bai('chuanHoaMatKhau_ bỏ khoảng trắng hai đầu, gộp dạng dấu', () => {
  assert.equal(h.chuanHoaMatKhau_('  abc123 \n'), 'abc123');
  assert.equal(h.chuanHoaMatKhau_('Đà'), 'Đà'); // dấu tổ hợp → dựng sẵn
  assert.equal(h.chuanHoaMatKhau_('a b'), 'a b');
  assert.equal(h.chuanHoaMatKhau_(null), '');
});

bai('soSanhDeu_', () => {
  assert.equal(h.soSanhDeu_('abc', 'abc'), true);
  assert.equal(h.soSanhDeu_('abc', 'abd'), false);
  assert.equal(h.soSanhDeu_('abc', 'abcd'), false);
  assert.equal(h.soSanhDeu_('', 'a'), false);
  assert.equal(h.soSanhDeu_('a', ''), false);
});

const dsTK = [
  ['email', 'unitCode', 'role'],
  ['qt@example.com', 'KHTC.SNNMT', 'Quản trị'],
  ['ql@example.com', 'BTTDC.SNNMT', 'Quản lý báo cáo'],
  ['nl@example.com', 'BQLDA.BinhThoi', 'Nhập liệu']
];

bai('laTaiKhoanQuanTri_ chỉ đúng vai trò Quản trị, đúng đơn vị', () => {
  assert.equal(h.laTaiKhoanQuanTri_(dsTK, 'QT@example.com ', 'KHTC.SNNMT'), true);
  assert.equal(h.laTaiKhoanQuanTri_(dsTK, 'qt@example.com', 'BTTDC.SNNMT'), false);
  assert.equal(h.laTaiKhoanQuanTri_(dsTK, 'ql@example.com', 'BTTDC.SNNMT'), false);
  assert.equal(h.laTaiKhoanQuanTri_(dsTK, 'nl@example.com', 'BQLDA.BinhThoi'), false);
  assert.equal(h.laTaiKhoanQuanTri_(dsTK, '', ''), false);
});

bai('phienHopLe_ — đổi mật khẩu (đợt mới) thì phiên cũ hết; phiên chỉ dùng ở lĩnh vực đã đăng nhập', () => {
  const p = { email: 'qt@example.com', dot: '1', linhVuc: 'BTTDC' };
  assert.equal(h.phienHopLe_(p, '1', 'BTTDC'), true);
  assert.equal(h.phienHopLe_(p, '2', 'BTTDC'), false);
  assert.equal(h.phienHopLe_(p, '1', 'NHIEMVU'), false);                              // b10b
  assert.equal(h.phienHopLe_({ email: 'qt@example.com', dot: '1' }, '1', ''), false);   // phiên cũ chưa có lĩnh vực
  assert.equal(h.phienHopLe_(null, '1', 'BTTDC'), false);
  assert.equal(h.phienHopLe_({ dot: '1', linhVuc: 'BTTDC' }, '1', 'BTTDC'), false);
});

console.log('kiem-gas-quan-tri: ' + soBai + ' bài đạt');
