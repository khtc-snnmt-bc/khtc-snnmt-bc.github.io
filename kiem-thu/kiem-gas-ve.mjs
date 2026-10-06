// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-ve.mjs
// Vai trò  : Kiểm hàm thuần taoVe_, docVe_ (vé nhớ đăng nhập) bằng Node
// Chạy     : node app/kiem-thu/kiem-gas-ve.mjs
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 20:11
// ============================================================
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('QuanTri.js') + '\n' + doc('VeDangNhap.js') + '\n;this.ham = { taoVe_, docVe_ };', sandbox);
const { taoVe_, docVe_ } = sandbox.ham;

const kyBang = (khoa) => (s) => createHmac('sha256', khoa).update(s).digest('hex');
const ky = kyBang('khoa-thu');

const ve = taoVe_(' A@Gmail.com ', ky);
assert.equal(ve.split('|')[0], 'a@gmail.com');
assert.equal(docVe_(ve, ky), 'a@gmail.com');
// Sửa Gmail trong vé → chữ ký không khớp
assert.equal(docVe_(ve.replace('a@', 'b@'), ky), null);
// Sửa chữ ký → hỏng
assert.equal(docVe_(ve.slice(0, -1) + (ve.endsWith('0') ? '1' : '0'), ky), null);
// Khoá bí mật đổi → mọi vé cũ hết tác dụng
assert.equal(docVe_(ve, kyBang('khoa-moi')), null);
// Vé rỗng / hỏng khuôn
assert.equal(docVe_('', ky), null);
assert.equal(docVe_(null, ky), null);
assert.equal(docVe_('khong-co-gach', ky), null);
assert.equal(docVe_('|' + ky(''), ky), null);
// Chỉ có Gmail, không chữ ký
assert.equal(docVe_('a@gmail.com|', ky), null);

console.log('kiem-gas-ve: 10 bài ĐẠT!');
