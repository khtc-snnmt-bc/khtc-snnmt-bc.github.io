// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-bang.mjs
// Vai trò  : Kiểm hàm thuần Quản lý bảng phía GAS (khai bảng mới, cài đặt sửa, kiểm mẫu)
// Chạy     : node app/kiem-thu/kiem-gas-bang.mjs
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 22:47
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(['DangNhap.js', 'QuanTri.js', 'PhanQuyen.js', 'KyBaoCao.js', 'QuanLyBang.js'].map(doc).join('\n') +
  '\n;this.ham = { cotNhapTuKhai_, kiemKhaiBangMoi_, kiemCaiDatSua_, kiemMau_, dongBangMoi_, caiDatChoTrang_, docCaiDat_ };', sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

bai('cột nhập suy từ kiểu cột (cột A là mã đơn vị)', () => {
  const k = (...ds) => ds.map((kieu) => ({ kieu }));
  assert.equal(h.cotNhapTuKhai_(k('chu', 'so', 'congThuc', 'ngay')), 'B:C, E');
  assert.equal(h.cotNhapTuKhai_(k('congThuc', 'chon')), 'C');
  assert.equal(h.cotNhapTuKhai_(k('congThuc')), '');
});

const khai = {
  tableCode: 'giai_ngan', tableName: ' Tiến độ giải ngân ', group: 'KHTC', sourceType: 'docLap',
  allowAddRows: true, dataRows: '',
  cot: [
    { ten: 'Tên dự án', kieu: 'chu' },
    { ten: 'Kế hoạch', kieu: 'so' },
    { ten: 'Đã giải ngân', kieu: 'so' },
    { ten: 'Tỷ lệ', kieu: 'congThuc', congThuc: '=IFERROR(D3/C3;"")' },
    { ten: 'Tình trạng', kieu: 'chon', luaChon: 'Đang làm, Xong,, Xong' }
  ]
};

bai('khai bảng mới hợp lệ → chuẩn hoá', () => {
  const kq = sach(h.kiemKhaiBangMoi_(khai, ['bttdc_duan']));
  assert.equal(kq.loi, undefined);
  assert.equal(kq.bang.tableName, 'Tiến độ giải ngân');
  assert.equal(kq.bang.dataRows, 20);
  assert.equal(kq.bang.inputCols, 'B:D, F');
  assert.deepEqual(kq.bang.cot[4].luaChon, ['Đang làm', 'Xong']);
});

bai('khai bảng mới sai → báo đúng chỗ', () => {
  const sai = (doi, chua) => {
    const kq = h.kiemKhaiBangMoi_(Object.assign({}, khai, doi), ['giai_ngan_cu', 'Bttdc']);
    assert.ok(kq.loi && kq.loi.includes(chua), JSON.stringify(doi) + ' → ' + kq.loi);
  };
  sai({ tableCode: 'Giải ngân' }, 'Mã bảng');
  sai({ tableCode: 'bttdc' }, 'đã có');
  sai({ tableName: '  ' }, 'tên bảng');
  sai({ sourceType: 'x' }, 'Cách nhập dòng');
  sai({ dataRows: '0' }, 'Số dòng sẵn');
  sai({ dataRows: '2.5' }, 'Số dòng sẵn');
  sai({ cot: [] }, 'chưa có cột');
  sai({ cot: [{ ten: 'A', kieu: 'chu' }, { ten: '', kieu: 'so' }] }, 'Cột C');
  sai({ cot: [{ ten: 'A', kieu: 'congThuc', congThuc: 'D3+1' }] }, 'dấu =');
  sai({ cot: [{ ten: 'A', kieu: 'chon', luaChon: ' , ' }] }, 'lựa chọn');
  sai({ cot: [{ ten: 'A', kieu: 'congThuc', congThuc: '=1' }] }, 'ít nhất một cột');
});

bai('cài đặt sửa trên app', () => {
  const kq = sach(h.kiemCaiDatSua_({ tableName: 'X', sourceType: 'gopTach', inputCols: 'c:j, l', inputRows: '5:20',
    lockedRows: '', allowAddRows: false, noteTabs: 'Chú thích, ', dataRows: '' }));
  assert.equal(kq.caiDat.inputCols, 'C:J, L');
  assert.equal(kq.caiDat.noteTabs, 'Chú thích');
  assert.equal(kq.caiDat.dataRows, '');
  assert.ok(h.kiemCaiDatSua_({ tableName: 'X', sourceType: 'docLap', inputCols: 'C-J' }).loi.includes('Cột được nhập'));
  assert.ok(h.kiemCaiDatSua_({ tableName: 'X', sourceType: 'docLap', inputCols: 'C', lockedRows: 'năm' }).loi.includes('Dòng khoá'));
  assert.ok(h.kiemCaiDatSua_({ tableName: 'X', sourceType: 'docLap', inputCols: 'C', dataRows: '-1' }).loi.includes('Số dòng sẵn'));
});

const cd = (doi) => Object.assign({ sourceType: 'gopTach', inputCols: 'C:D', inputRows: '', lockedRows: '', noteTabs: [], dataRows: '' }, doi);
const mau = (doi) => Object.assign({ cotA: ['Bảng', 'Mã đơn vị', 'DV1', '', 'DV2'], soCot: 5, tenTab: ['Mẫu', 'Chú thích'], oLoi: [] }, doi);
const cho = (ds) => sach(ds).map((l) => l.cho + ' | ' + l.loi);

bai('kiểm mẫu: hợp lệ → rỗng', () => {
  assert.deepEqual(cho(h.kiemMau_(mau(), cd(), ['DV1', 'DV2'])), []);
  assert.deepEqual(cho(h.kiemMau_(mau({ cotA: ['Bảng', 'Mã đơn vị'] }), cd({ sourceType: 'docLap', dataRows: 20 }), [])), []);
});

bai('kiểm mẫu: thiếu dòng Mã đơn vị → chỉ báo một lỗi', () => {
  const kq = cho(h.kiemMau_(mau({ cotA: ['Bảng', 'Ma don vi'] }), cd(), []));
  assert.equal(kq.length, 1);
  assert.match(kq[0], /^Tab đầu/);
});

bai('kiểm mẫu: cột / dòng / mã / tab / công thức', () => {
  const kq = cho(h.kiemMau_(
    mau({ cotA: ['Bảng', 'Mã đơn vị', 'DV1', 'XX', 'XX'], oLoi: [{ a1: 'E3', giaTri: '#NAME?' }] }),
    cd({ inputCols: 'A, D:G', inputRows: '2, 3:9', noteTabs: ['Chú thích', 'Căn cứ', 'Mẫu'] }), ['DV1']));
  assert.deepEqual(kq, [
    'Cột được nhập | Có cột A',
    'Cột được nhập | Cột F, G nằm ngoài bảng',
    'Dòng được nhập | Dòng 2, 6–9 không phải dòng dữ liệu',
    'Cột A dòng 4–5 | Mã "XX" không có trong danh mục đơn vị',
    'Tab chú thích | Không có tab "Căn cứ"',
    'Tab chú thích | "Mẫu" đang là tab đầu',
    'Ô E3 | Công thức báo #NAME?'
  ]);
});

bai('kiểm mẫu: Sở giao dòng chưa có mã · tự nhập dòng có chữ ở cột A / không có dòng', () => {
  assert.deepEqual(cho(h.kiemMau_(mau({ cotA: ['Bảng', 'Mã đơn vị', '', ''] }), cd(), [])),
    ['Cột A | Chưa có dòng nào ghi mã đơn vị']);
  assert.deepEqual(cho(h.kiemMau_(mau(), cd({ sourceType: 'docLap' }), ['DV1', 'DV2'])),
    ['Cột A dòng 3, 5 | Bảng đơn vị tự nhập dòng mà cột A đã có chữ']);
  assert.deepEqual(cho(h.kiemMau_(mau({ cotA: ['Bảng', 'Mã đơn vị'] }), cd({ sourceType: 'docLap' }), [])),
    ['Mẫu | Chưa có dòng dữ liệu nào']);
  assert.deepEqual(cho(h.kiemMau_(mau(), cd({ inputCols: '' }), ['DV1', 'DV2'])), ['Cột được nhập | Chưa khai']);
});

bai('dòng tab Bảng: giữ ô cũ, thay ô có giá trị mới', () => {
  assert.deepEqual(sach(h.dongBangMoi_(['tableCode', 'tableName', 'managerUnits'], ['a', 'Cũ', 'X'], { tableName: 'Mới' })),
    ['a', 'Mới', 'X']);
  assert.deepEqual(sach(h.dongBangMoi_(['tableCode', 'group'], null, { tableCode: 'b' })), ['b', '']);
});

bai('cài đặt cho trang: chữ hoá, noteTabs nối lại', () => {
  const kq = sach(h.caiDatChoTrang_([
    ['tableCode', 'templateFileId', 'sourceType', 'inputCols', 'inputRows', 'allowAddRows', 'noteTabs', 'dataRows'],
    ['a', 'ID', 'docLap', 'C:J', 5, 'TRUE', 'X, Y', 20],
    ['', '', '', '', '', '', '', '']
  ]));
  assert.deepEqual(Object.keys(kq), ['a']);
  assert.deepEqual(kq.a, { templateFileId: 'ID', sourceType: 'docLap', inputCols: 'C:J', inputRows: '5', lockedRows: '',
    allowAddRows: true, noteTabs: 'X, Y', dataRows: '20' });
});

console.log('kiem-gas-bang: ' + soBai + ' bài đạt');
