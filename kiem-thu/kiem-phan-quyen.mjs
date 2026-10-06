// ============================================================
// bcsnn · app/kiem-thu/kiem-phan-quyen.mjs
// Vai trò  : Kiểm domains trang quản trị (phan-quyen.js) + file của bảng ở sidebar (ky-bao-cao.js)
// Chạy     : node app/kiem-thu/kiem-phan-quyen.mjs
// Phiên bản: 0.3.0 · Cập nhật: 06/10/2026 21:41
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

bai('quanLyMacDinh: đã lưu → giữ; cùng lĩnh vực → theo; còn lại → mã mở đầu bằng lĩnh vực', () => {
  const dv = [{ unitCode: 'BTTDC.SNNMT' }, { unitCode: 'KHTC.SNNMT' }, { unitCode: 'BTTDCX' }];
  const a = { tableCode: 'a', group: 'BTTDC', managerUnits: [] };
  const b = { tableCode: 'b', group: 'BTTDC', managerUnits: ['KHTC.SNNMT', 'BTTDC.SNNMT'] };
  assert.deepEqual(sach(PQ.quanLyMacDinh(a, [a], dv)), ['BTTDC.SNNMT']);
  assert.deepEqual(sach(PQ.quanLyMacDinh(a, [a, b], dv)), ['KHTC.SNNMT', 'BTTDC.SNNMT']);
  assert.deepEqual(sach(PQ.quanLyMacDinh(b, [a, b], dv)), ['KHTC.SNNMT', 'BTTDC.SNNMT']);
  assert.deepEqual(sach(PQ.quanLyMacDinh({ group: 'KHAC', managerUnits: [] }, [], dv)), []);
  assert.deepEqual(sach(PQ.quanLyMacDinh({ group: '', managerUnits: [] }, [], dv)), []);
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

bai('kỳ của bảng: mới nhất lên đầu; đặt trạng thái', () => {
  const ky = [
    { tableCode: 'X', periodName: '10.10.2026', locked: false },
    { tableCode: 'X', periodName: '05.01.2027', locked: false },
    { tableCode: 'Y', periodName: '10.12.2026', locked: false },
    { tableCode: 'X', periodName: '10.11.2026', locked: true }
  ];
  assert.deepEqual(KY.kyCuaBang(ky, 'X').map((k) => k.periodName), ['05.01.2027', '10.11.2026', '10.10.2026']);
  const moi = KY.datKy(ky, 'X', '10.10.2026', true);
  assert.equal(moi.length, 4);
  assert.equal(moi[0].locked, true);
  assert.equal(ky[0].locked, false);
  assert.equal(KY.datKy(ky, 'Y', '10.01.2027', false).length, 5);
});

bai('gộp lô + câu báo tạo / khoá kỳ', () => {
  const lo1 = { tenKy: '10.11.2026', tong: 3, daTao: 1, fileMoi: 1, daCo: 0, loi: ['A: x'], tiepTu: 2, quyen: { loi: [] } };
  const lo2 = { tenKy: '10.11.2026', tong: 3, daTao: 1, fileMoi: 0, daCo: 0, loi: [], tiepTu: null };
  const kq = KY.gopLo(KY.gopLo(null, lo1), lo2);
  assert.equal(kq.daTao, 2);
  assert.equal(kq.fileMoi, 1);
  assert.equal(kq.tiepTu, null);
  assert.equal(KY.tomTatTaoKy(kq), 'Đã tạo kỳ 10.11.2026 cho 2/3 đơn vị (tạo mới 1 file). Lỗi: A: x');
  assert.equal(KY.tomTatTaoKy({ tenKy: '10.11.2026', tong: 0, loi: [] }), 'Đã ghi kỳ 10.11.2026. Bảng chưa giao cho đơn vị nào.');
  assert.equal(KY.tomTatKhoaKy({ tenKy: '10.11.2026', khoa: true, tong: 2, daLam: 1, khongCoTab: 1, loi: [] }),
    'Đã khoá kỳ 10.11.2026 ở 1/2 file. 1 file chưa có tab kỳ này.');
});

console.log('ĐẠT ' + soBai + ' bài — kiem-phan-quyen');
