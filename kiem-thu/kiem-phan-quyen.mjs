// ============================================================
// bcsnn · app/kiem-thu/kiem-phan-quyen.mjs
// Vai trò  : Kiểm domains trang quản trị (phan-quyen.js) + file của bảng ở sidebar (ky-bao-cao.js)
// Chạy     : node app/kiem-thu/kiem-phan-quyen.mjs
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 20:54
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sandbox = {};
vm.createContext(sandbox);
['js/utils/bo-dau.js', 'js/domains/phan-quyen.js', 'js/domains/ky-bao-cao.js'].forEach((f) => {
  vm.runInContext(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), sandbox);
});
vm.runInContext('this.PQ = PHAN_QUYEN; this.KY = KY_BAO_CAO;', sandbox);
const { PQ, KY } = sandbox;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

const donVi = [{ unitCode: 'B', unitName: 'Ban Bình Thới' }, { unitCode: 'A', unitName: 'Ban An Hoà' }];

bai('xepDonVi / locDonVi không dấu', () => {
  const xep = PQ.xepDonVi(donVi);
  assert.deepEqual(xep.map((d) => d.unitCode), ['A', 'B']);
  assert.deepEqual(PQ.locDonVi(xep, 'binh thoi').map((d) => d.unitCode), ['B']);
  assert.equal(PQ.locDonVi(xep, '').length, 2);
});

bai('taiKhoanCuaDonVi / thayTaiKhoan', () => {
  const tk = [{ email: 'a@x.com', unitCode: 'A', role: 'Nhập liệu' }, { email: 'b@x.com', unitCode: 'B', role: 'Nhập liệu' }];
  assert.deepEqual(sach(PQ.taiKhoanCuaDonVi(tk, 'A')), [{ email: 'a@x.com', role: 'Nhập liệu' }]);
  const moi = sach(PQ.thayTaiKhoan(tk, 'A', [{ email: ' C@X.com', role: 'Quản trị' }]));
  assert.deepEqual(moi, [tk[1], { email: 'c@x.com', unitCode: 'A', role: 'Quản trị' }]);
});

bai('giaoCuaBang / thayGiao giữ đơn vị đã có file', () => {
  const giao = [{ unitCode: 'A', tableCode: 't', coFile: true }, { unitCode: 'B', tableCode: 't', coFile: false },
    { unitCode: 'A', tableCode: 'k', coFile: false }];
  assert.deepEqual(sach(PQ.giaoCuaBang(giao, 't')), { A: true, B: false });
  const moi = sach(PQ.thayGiao(giao, 't', ['C']));
  assert.deepEqual(moi.filter((g) => g.tableCode === 't').map((g) => g.unitCode).sort(), ['A', 'C']);
  assert.equal(moi.filter((g) => g.tableCode === 'k').length, 1);
});

bai('tomTatLuu', () => {
  assert.equal(PQ.tomTatLuu({ quyen: { soFile: 2, them: 0, doi: 0, go: 0, loi: [] } }, String), 'Đã lưu.');
  const c = PQ.tomTatLuu({ giuLai: ['A'], quyen: { soFile: 3, them: 1, doi: 0, go: 0, loi: ['x'] } }, () => 'Ban A');
  assert.match(c, /cập nhật quyền 3 file/);
  assert.match(c, /Ban A/);
  assert.match(c, /Lỗi chia quyền 1 file: x/);
});

bai('dsFileBang: bảng thường / bảng quản lý', () => {
  assert.deepEqual(sach(KY.dsFileBang({ tableName: 'T', fileId: 'F' })), [{ fileId: 'F', nhan: 'T' }]);
  const ql = sach(KY.dsFileBang({ tableName: 'T', fileId: 'TONG', donVi: [{ unitCode: 'A', unitName: 'Ban A', fileId: 'FA' }] }));
  assert.deepEqual(ql, [{ fileId: 'TONG', nhan: 'Bảng tổng' }, { fileId: 'FA', nhan: 'Ban A' }]);
  assert.deepEqual(sach(KY.dsFileBang({ tableName: 'T', fileId: '', donVi: [] })), []);
});

console.log('ĐẠT ' + soBai + ' bài — kiem-phan-quyen');
