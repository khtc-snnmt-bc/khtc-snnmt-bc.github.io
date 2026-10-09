// ============================================================
// bcsnn · app/kiem-thu/kiem-phan-quyen.mjs
// Vai trò  : Kiểm domains trang quản trị (phan-quyen.js, ky-bao-cao.js, quan-ly-bang.js: tên bảng từ Excel)
// Chạy     : node app/kiem-thu/kiem-phan-quyen.mjs
// Phiên bản: 0.5.0 · Cập nhật: 09/10/2026 12:30
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sandbox = {};
vm.createContext(sandbox);
['js/utils/bo-dau.js', 'js/domains/phan-quyen.js', 'js/domains/ky-bao-cao.js', 'js/domains/quan-ly-bang.js'].forEach((f) => {
  vm.runInContext(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), sandbox);
});
vm.runInContext('this.PQ = PHAN_QUYEN; this.KY = KY_BAO_CAO; this.QLB = QUAN_LY_BANG;', sandbox);
const { PQ, KY, QLB } = sandbox;
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

bai('giaoCuaBang / thayGiao: bỏ quyền đơn vị đã có file thì giữ dòng access khong', () => {
  const giao = [{ unitCode: 'A', tableCode: 't', coFile: true }, { unitCode: 'B', tableCode: 't', coFile: false },
    { unitCode: 'A', tableCode: 'k', coFile: false }];
  assert.deepEqual(sach(PQ.giaoCuaBang(giao, 't')), { A: true, B: false });
  const moi = sach(PQ.thayGiao(giao, 't', { C: 'xem' }));
  const t = moi.filter((g) => g.tableCode === 't');
  assert.deepEqual(t.map((g) => g.unitCode + ':' + g.access).sort(), ['A:khong', 'C:xem']);
  assert.deepEqual(sach(PQ.giaoCuaBang(moi, 't')), { C: false });   // A không còn tính là được giao
  assert.equal(moi.filter((g) => g.tableCode === 'k').length, 1);
  assert.equal(PQ.quyenTuO(true, false), 'sua');
  assert.equal(PQ.quyenTuO(false, true), 'xem');
  assert.equal(PQ.quyenTuO(false, false), 'khong');
  const dv = [{ unitCode: 'A', role: 'Đơn vị báo cáo' }, { unitCode: 'B', role: 'Đơn vị báo cáo' },
    { unitCode: 'KHTC', role: 'Quản trị' }, { unitCode: 'BT', role: 'Quản lý báo cáo' }];
  const chia = sach(PQ.chiaDonViBang(dv, ['B']));
  assert.deepEqual(chia.trong.map((d) => d.unitCode), ['B']);
  assert.deepEqual(chia.themDuoc.map((d) => d.unitCode), ['A']);   // nhóm Quản trị không thêm vào bảng
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
  const c = PQ.tomTatLuu({ quyen: { soFile: 3, them: 1, doi: 0, go: 0, loi: ['x'] } }, () => 'Ban A');
  assert.match(c, /cập nhật quyền 3 file/);
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

bai('gộp lô + câu báo tổng hợp kỳ', () => {
  const lo1 = { tenKy: '20.11.2026', tong: 3, daDoc: 1, thieuTab: 1, loi: [], tiepTu: 2 };
  const lo2 = { tenKy: '20.11.2026', laTong: false, tong: 3, daDoc: 1, thieuTab: 0, loi: [], tiepTu: null,
    xong: true, soDonVi: 2, soDong: 5, dongThem: 1, khongKhop: 0, boQua: 0 };
  const kq = KY.gopLo(KY.gopLo(null, lo1), lo2);
  assert.equal(kq.thieuTab, 1);
  assert.equal(KY.tomTatTongHop(kq), 'Đã tổng hợp kỳ 20.11.2026 từ 2/3 đơn vị vào file tổng (ghép 5 dòng). ' +
    '1 file chưa có tab kỳ này. Trong đó 1 dòng đơn vị tự thêm.');
  assert.equal(KY.tomTatTongHop({ tenKy: '20.11.2026', laTong: true, tong: 2, soDonVi: 2, soDong: 3, boQua: 1, loi: ['A: x'] }),
    'Đã tổng hợp kỳ 20.11.2026 từ 2/2 đơn vị vào file tổng (cộng từng ô). 1 ô ghi chữ ở cột số bị bỏ qua. Lỗi: A: x');
});

bai('ngày tự khoá gợi ý (giống GAS hanKhoaMacDinh_)', () => {
  assert.equal(KY.hanKhoaGoiY('2026-09-30', '5'), '2026-10-05');
  assert.equal(KY.hanKhoaGoiY('2026-10-05', 5), '2026-11-05');
  assert.equal(KY.hanKhoaGoiY('2026-01-31', 31), '2026-02-28');
  assert.equal(KY.hanKhoaGoiY('2026-12-10', 5), '2027-01-05');
  assert.equal(KY.hanKhoaGoiY('2026-10-10', ''), '');
  assert.equal(KY.hanKhoaGoiY('', 5), '');
  assert.equal(KY.ngayChoO('05.11.2026'), '2026-11-05');
  assert.equal(KY.ngayChoO(''), '');
});

bai('datKy giữ / thay ngày tự khoá', () => {
  const ds = [{ tableCode: 'a', periodName: '10.10.2026', locked: false, lockDate: '05.11.2026' }];
  assert.equal(KY.datKy(ds, 'a', '10.10.2026', true)[0].lockDate, '05.11.2026');
  assert.equal(KY.datKy(ds, 'a', '10.10.2026', false, '')[0].lockDate, '');
  assert.deepEqual(sach(KY.datKy(ds, 'a', '01.12.2026', false, '05.12.2026')[1]),
    { tableCode: 'a', periodName: '01.12.2026', locked: false, lockDate: '05.12.2026' });
});

bai('tên bảng từ Excel: dòng một ô có chữ phía trên "Mã đơn vị"', () => {
  assert.deepEqual(sach(QLB.tenBangTuExcel([['Tiến độ  giải ngân'], ['', 'Nhóm A', '', 'Nhóm B'], ['Mã đơn vị', 'X']])),
    { coMaDonVi: true, tenBang: 'Tiến độ giải ngân' });
  assert.deepEqual(sach(QLB.tenBangTuExcel([['', 'DỰ ÁN', '', 'TIẾN ĐỘ'], ['', 'Mã', 'Tên'], ['Mã đơn vị']])),
    { coMaDonVi: true, tenBang: '' });
  assert.deepEqual(sach(QLB.tenBangTuExcel([['Mã đơn vị', 'Tên']])), { coMaDonVi: true, tenBang: '' });
  assert.deepEqual(sach(QLB.tenBangTuExcel([['Bảng X'], ['Ma don vi']])), { coMaDonVi: false, tenBang: '' });
  // Bảng Sở giao dòng: GAS đã tự giao theo mã cột A → báo số đơn vị, không bảo bấm giao nữa
  const g = { ok: true, moi: ['A', 'B'], tong: 2, coAll: false, sai: [], docDuoc: 2 };
  const chu = QLB.baoTaoTuExcel({ tableName: 'T' }, true, g);
  assert.match(chu, /Đã giao thêm 2 đơn vị/);
  assert.doesNotMatch(chu, /Giao theo mã trong bảng/);
  assert.match(QLB.baoTaoTuExcel({ tableName: 'T' }, true, { ok: false, loi: 'x' }), /Giao theo mã trong bảng/);
});

console.log('ĐẠT ' + soBai + ' bài — kiem-phan-quyen');
