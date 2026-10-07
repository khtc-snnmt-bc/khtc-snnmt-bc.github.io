// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-ky.mjs
// Vai trò  : Kiểm hàm thuần Kỳ báo cáo phía GAS (tên kỳ, sổ kỳ, giao của bảng, kế hoạch khoá, tự khoá)
// Chạy     : node app/kiem-thu/kiem-gas-ky.mjs
// Phiên bản: 0.2.0 · Cập nhật: 07/10/2026 23:40
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('DangNhap.js') + '\n' + doc('QuanTri.js') + '\n' + doc('PhanQuyen.js') + '\n' + doc('KyBaoCao.js') +
  '\n;this.ham = { chuanHoaTenKy_, docKyQuanLy_, dongKy_, giaoCuaBangKy_, docCaiDat_, keHoachKhoa_,' +
  ' fileTrongPhamVi_, docBangQuanLy_, docFileQuanLy_, ngayKhoaThang_, hanKhoaMacDinh_, kyDenHan_, docHanKhoaGui_ };', sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

bai('tên kỳ từ ô chọn ngày / gõ tay', () => {
  assert.equal(h.chuanHoaTenKy_('2026-10-10'), '10.10.2026');
  assert.equal(h.chuanHoaTenKy_('2026-1-5'), '05.01.2026');
  assert.equal(h.chuanHoaTenKy_(' 5.1.2026 '), '05.01.2026');
  assert.equal(h.chuanHoaTenKy_('31.12.2026'), '31.12.2026');
  assert.equal(h.chuanHoaTenKy_('2026-02-30'), '');
  assert.equal(h.chuanHoaTenKy_('31.04.2026'), '');
  assert.equal(h.chuanHoaTenKy_('10/10/2026'), '');
  assert.equal(h.chuanHoaTenKy_(''), '');
  assert.equal(h.chuanHoaTenKy_(undefined), '');
});

const tabKy = [
  ['tableCode', 'periodName', 'locked', 'createdAt'],
  ['duan', '10.09.2026', true, 'ngay'],
  ['duan', '10.10.2026', 'FALSE', 'ngay', '05.11.2026'],
  ['khokhan', '10.10.2026', 'TRUE', 'ngay', new Date(2026, 10, 5)],
  ['', '', '', '']
];

bai('đọc sổ kỳ', () => {
  assert.deepEqual(sach(h.docKyQuanLy_(tabKy)), [
    { tableCode: 'duan', periodName: '10.09.2026', locked: true, lockDate: '' },
    { tableCode: 'duan', periodName: '10.10.2026', locked: false, lockDate: '05.11.2026' },
    { tableCode: 'khokhan', periodName: '10.10.2026', locked: true, lockDate: '05.11.2026' }
  ]);
  assert.deepEqual(sach(h.docKyQuanLy_([])), []);
  // Sheet tự đổi chữ '10.11.2026' thành ngày → vẫn đọc ra đúng tên kỳ
  assert.equal(h.docKyQuanLy_([tabKy[0], ['duan', new Date(2026, 10, 10), false]])[0].periodName, '10.11.2026');
  assert.equal(h.dongKy_([tabKy[0], ['duan', new Date(2026, 10, 10), false]], 'duan', '10.11.2026'), 2);
});

bai('tìm dòng của kỳ trong sổ', () => {
  assert.equal(h.dongKy_(tabKy, 'duan', '10.10.2026'), 3);
  assert.equal(h.dongKy_(tabKy, 'khokhan', '10.10.2026'), 4);
  assert.equal(h.dongKy_(tabKy, 'khokhan', '10.09.2026'), 0);
});

bai('giao của một bảng giữ số dòng Sheet (để ghi fileId mới)', () => {
  const tabFile = [
    ['unitCode', 'tableCode', 'fileId', 'createdAt'],
    ['A', 'duan', 'F_A', 'ngay'],
    ['A', 'khokhan', 'F_A_KK', 'ngay'],
    ['C', 'duan', '', ''],
    ['', 'duan', 'X', '']
  ];
  assert.deepEqual(sach(h.giaoCuaBangKy_(tabFile, 'duan')), [
    { unitCode: 'A', fileId: 'F_A', dong: 2 },
    { unitCode: 'C', fileId: '', dong: 4 }
  ]);
});

bai('cài đặt bảng: bỏ khoảng trắng mã, tab chú thích thành mảng', () => {
  const cd = h.docCaiDat_(['tableCode', 'templateFileId', 'allowAddRows', 'noteTabs'], [' duan ', ' T1 ', 'TRUE', 'A, B']);
  assert.equal(cd.tableCode, 'duan');
  assert.equal(cd.templateFileId, 'T1');
  assert.equal(cd.allowAddRows, true);
  assert.deepEqual(sach(cd.noteTabs), ['A', 'B']);
});

bai('kế hoạch khoá: không thêm dòng → bảo vệ cả tab, chừa ô nhập', () => {
  const kh = h.keHoachKhoa_({ inputCols: 'C:D', inputRows: '', lockedRows: '', allowAddRows: false },
    3, 5, { 6: 4, 9: 5 }, 5);
  assert.deepEqual(sach(kh), { kieu: 'toanTab', vungMo: [{ dong: [4, 5], cot: [3, 4] }] });
});

bai('soát quyền theo danh sách file mới tạo', () => {
  const bang = h.docBangQuanLy_([['tableCode', 'tableName', 'group', 'templateFileId', 'managerUnits'],
    ['duan', 'Dự án', 'BTTDC', 'TONG', 'QL']]);
  const file = h.docFileQuanLy_([['unitCode', 'tableCode', 'fileId'], ['A', 'duan', 'F_A'], ['B', 'duan', 'F_B']]);
  assert.deepEqual(sach(h.fileTrongPhamVi_(bang, file, { fileIds: ['F_B'] })), ['F_B']);
  assert.deepEqual(sach(h.fileTrongPhamVi_(bang, file, { fileIds: ['F_B'], unitCodes: ['A'] })), ['F_B', 'F_A']);
});

bai('ngày tự khoá hằng tháng của bảng', () => {
  assert.equal(h.ngayKhoaThang_(''), '');
  assert.equal(h.ngayKhoaThang_(undefined), '');
  assert.equal(h.ngayKhoaThang_(' 5 '), 5);
  assert.equal(h.ngayKhoaThang_(31), 31);
  assert.equal(h.ngayKhoaThang_('0'), -1);
  assert.equal(h.ngayKhoaThang_('32'), -1);
  assert.equal(h.ngayKhoaThang_('5.5'), -1);
});

bai('ngày tự khoá mặc định = ngày N đầu tiên SAU ngày kỳ', () => {
  assert.equal(h.hanKhoaMacDinh_('30.09.2026', 5), '05.10.2026');
  assert.equal(h.hanKhoaMacDinh_('01.10.2026', 5), '05.10.2026');
  assert.equal(h.hanKhoaMacDinh_('05.10.2026', 5), '05.11.2026');   // trùng ngày kỳ → tháng sau
  assert.equal(h.hanKhoaMacDinh_('10.12.2026', '5'), '05.01.2027');
  assert.equal(h.hanKhoaMacDinh_('31.01.2026', 31), '28.02.2026');   // tháng thiếu ngày → cuối tháng
  assert.equal(h.hanKhoaMacDinh_('15.01.2026', 31), '31.01.2026');
  assert.equal(h.hanKhoaMacDinh_('10.10.2026', ''), '');
  assert.equal(h.hanKhoaMacDinh_('', 5), '');
});

bai('kỳ tới hạn tự khoá: đang mở, có ngày, ngày ≤ hôm nay', () => {
  const ds = [
    { tableCode: 'a', periodName: '10.09.2026', locked: false, lockDate: '05.10.2026' },
    { tableCode: 'a', periodName: '10.10.2026', locked: false, lockDate: '05.11.2026' },
    { tableCode: 'b', periodName: '10.09.2026', locked: true, lockDate: '05.10.2026' },
    { tableCode: 'c', periodName: '10.09.2026', locked: false, lockDate: '' },
    { tableCode: 'd', periodName: '10.09.2026', locked: false, lockDate: '05.11.2025' }
  ];
  assert.deepEqual(sach(h.kyDenHan_(ds, '05.10.2026')).map((k) => k.tableCode), ['a', 'd']);
  assert.deepEqual(sach(h.kyDenHan_(ds, '04.10.2026')).map((k) => k.tableCode), ['d']);
});

bai('ô ngày tự khoá gửi lên', () => {
  assert.equal(h.docHanKhoaGui_(undefined).han, undefined);
  assert.equal(h.docHanKhoaGui_('').han, '');
  assert.equal(h.docHanKhoaGui_('2026-11-05').han, '05.11.2026');
  assert.ok(h.docHanKhoaGui_('2026-02-30').loi);
});

console.log('kiem-gas-ky: ' + soBai + ' bài ĐẠT');
