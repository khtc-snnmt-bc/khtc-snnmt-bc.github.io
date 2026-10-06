// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-ky.mjs
// Vai trò  : Kiểm hàm thuần Kỳ báo cáo phía GAS (tên kỳ, sổ kỳ, giao của bảng, kế hoạch khoá)
// Chạy     : node app/kiem-thu/kiem-gas-ky.mjs
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 21:41
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('DangNhap.js') + '\n' + doc('QuanTri.js') + '\n' + doc('PhanQuyen.js') + '\n' + doc('KyBaoCao.js') +
  '\n;this.ham = { chuanHoaTenKy_, docKyQuanLy_, dongKy_, giaoCuaBangKy_, docCaiDat_, keHoachKhoa_,' +
  ' fileTrongPhamVi_, docBangQuanLy_, docFileQuanLy_ };', sandbox);
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
  ['duan', '10.10.2026', 'FALSE', 'ngay'],
  ['khokhan', '10.10.2026', 'TRUE', 'ngay'],
  ['', '', '', '']
];

bai('đọc sổ kỳ', () => {
  assert.deepEqual(sach(h.docKyQuanLy_(tabKy)), [
    { tableCode: 'duan', periodName: '10.09.2026', locked: true },
    { tableCode: 'duan', periodName: '10.10.2026', locked: false },
    { tableCode: 'khokhan', periodName: '10.10.2026', locked: true }
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

console.log('kiem-gas-ky: ' + soBai + ' bài ĐẠT');
