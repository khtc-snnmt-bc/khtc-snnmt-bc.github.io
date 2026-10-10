// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-bang.mjs
// Vai trò  : Kiểm hàm thuần Quản lý bảng phía GAS (khai bảng mới, tải Excel, cài đặt sửa, kiểm mẫu, mã all, đủ file / tab kỳ)
// Chạy     : node app/kiem-thu/kiem-gas-bang.mjs
// Phiên bản: 0.6.0 · Cập nhật: 10/10/2026 20:10
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(['DangNhap.js', 'QuanTri.js', 'PhanQuyen.js', 'KyBaoCao.js', 'QuanLyBang.js'].map(doc).join('\n') +
  '\n;this.ham = { cotNhapTuKhai_, kiemKhaiBangMoi_, kiemCaiDatSua_, kiemMau_, dongBangMoi_, caiDatChoTrang_, docCaiDat_,' +
  ' dongGiuLai_, maTrongMau_, kiemKhaiTaiMau_, loiChoExcel_,' +
  ' donViPhanQuyen_, dongCuoiCoMa_, kiemDuFile_ };', sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

{
  // Đơn vị ở mục Phân quyền theo file tổng; nhóm Quản trị không hiện
  const tatCa = ['A', 'B', 'C', 'KHTC'], tq = ['KHTC'];
  assert.deepEqual(sach(h.donViPhanQuyen_(true, { ma: ['B', 'KHTC'], coAll: false }, tatCa, tq)), ['B']);
  assert.deepEqual(sach(h.donViPhanQuyen_(true, { ma: ['B'], coAll: true }, tatCa, tq)), ['A', 'B', 'C']);
  assert.deepEqual(sach(h.donViPhanQuyen_(false, { ma: [], coAll: false }, tatCa, tq)), ['A', 'B', 'C']);
  // Dòng cuối có mã ở cột A (bỏ dòng trống phía sau); chưa có → dòng tiêu đề
  assert.equal(h.dongCuoiCoMa_(['Tên', 'Mã đơn vị', 'A', '', 'B', '', ''], 2), 5);
  assert.equal(h.dongCuoiCoMa_(['Tên', 'Mã đơn vị', '', ''], 2), 2);
}

{
  // Đủ file / đủ tab kỳ: A đủ · B thiếu kỳ · C chưa file (không có dòng cột A) · D file hỏng
  // · E bỏ quyền (không tính) · F chưa kiểm kịp · G có mã cột A nhưng chưa giao
  const giao = [
    { unitCode: 'A', fileId: 'fA', access: 'sua' }, { unitCode: 'B', fileId: 'fB', access: 'xem' },
    { unitCode: 'C', fileId: '', access: 'sua' }, { unitCode: 'D', fileId: 'fD', access: 'sua' },
    { unitCode: 'E', fileId: '', access: 'khong' }, { unitCode: 'F', fileId: 'fF', access: 'sua' }
  ];
  const kq = sach(h.kiemDuFile_(giao, { ma: ['A', 'B', 'D', 'E', 'F', 'G'], coAll: false }, ['10.10.2026', '10.11.2026'],
    { A: ['10.11.2026', 'Chú thích', '10.10.2026'], B: ['10.10.2026'], D: null }, ['Mẫu', '10.10.2026']));
  assert.deepEqual(kq, { soKy: 2, soDonVi: 5, coFile: 4, tongThieu: ['10.11.2026'],
    thieuFile: [{ unitCode: 'C', ly: 'không có dòng nào mang mã này ở cột A file tổng' }], fileHong: ['D'], chuaGiao: ['G'],
    thieuTab: [{ unitCode: 'B', ky: ['10.11.2026'] }], chuaKiem: 1 });
  // Có dòng all / bảng tự nhập dòng → không nêu lý do cột A, không có "chưa giao"
  assert.equal(h.kiemDuFile_(giao, { ma: [], coAll: true }, [], {}).thieuFile[0].ly, '');
  assert.deepEqual(sach(h.kiemDuFile_(giao, null, [], {}).chuaGiao), []);
}

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

bai('cột nhập suy từ kiểu cột (cột A là mã đơn vị)', () => {
  const k = (...ds) => ds.map((kieu) => ({ kieu }));
  assert.equal(h.cotNhapTuKhai_(k('chu', 'so', 'congThuc', 'ngay')), 'B:C, E');
  assert.equal(h.cotNhapTuKhai_(k('congThuc', 'chon')), 'C');
  assert.equal(h.cotNhapTuKhai_(k('congThuc')), '');
});

const khai = {
  tableCode: 'giai_ngan', tableName: ' Tiến độ giải ngân ', sourceType: 'docLap',
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
  assert.equal(kq.bang.aggregateType, 'ghep');
  assert.equal(kq.bang.sourceType, 'docLap');
  assert.equal(kq.bang.group, undefined, 'b10b: bảng không còn lĩnh vực — lĩnh vực là cả Sheet quản lý');
  const tong = sach(h.kiemKhaiBangMoi_(Object.assign({}, khai, { aggregateType: 'tong' }), []));
  assert.equal(tong.bang.sourceType, 'gopTach', 'bảng tổng luôn Sở giao dòng');
  assert.equal(tong.bang.allowAddRows, false, 'bảng tổng không cho thêm dòng');
  assert.equal(kq.bang.allowAddRows, true);
  assert.equal(sach(h.docCaiDat_(['tableCode', 'aggregateType', 'allowAddRows'], ['a', 'tong', true])).allowAddRows, false);
  const cot = sach(h.kiemKhaiBangMoi_(Object.assign({}, khai, { aggregateType: 'cot' }), []));
  assert.equal(cot.bang.sourceType, 'gopTach', 'Ghép cột luôn Sở giao dòng');
  assert.equal(cot.bang.allowAddRows, false);
  const cdCot = sach(h.docCaiDat_(['tableCode', 'aggregateType', 'allowAddRows'], ['a', ' cot ', true]));
  assert.deepEqual([cdCot.aggregateType, cdCot.allowAddRows], ['cot', false]);
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
  sai({ aggregateType: 'cong' }, 'Cách tổng hợp');
  sai({ dataRows: '0' }, 'Số dòng sẵn');
  sai({ dataRows: '2.5' }, 'Số dòng sẵn');
  sai({ cot: [] }, 'chưa có cột');
  sai({ cot: [{ ten: 'A', kieu: 'chu' }, { ten: '', kieu: 'so' }] }, 'Cột C');
  sai({ cot: [{ ten: 'A', kieu: 'congThuc', congThuc: 'D3+1' }] }, 'dấu =');
  sai({ cot: [{ ten: 'A', kieu: 'chon', luaChon: ' , ' }] }, 'lựa chọn');
  sai({ cot: [{ ten: 'A', kieu: 'congThuc', congThuc: '=1' }] }, 'ít nhất một cột');
});

bai('cài đặt sửa trên app', () => {
  const kq = sach(h.kiemCaiDatSua_({ tableName: 'X', group: 'BTTDC', sourceType: 'gopTach', inputCols: 'c:j, l', inputRows: '5:20',
    lockedRows: '', allowAddRows: false, noteTabs: 'Chú thích, ', dataRows: '' }));
  assert.equal(kq.caiDat.group, undefined, 'b10b: không ghi lĩnh vực vào tab Bảng');
  assert.equal(kq.caiDat.aggregateType, 'ghep');
  assert.equal(kq.caiDat.inputCols, 'C:J, L');
  assert.equal(kq.caiDat.noteTabs, 'Chú thích');
  assert.equal(kq.caiDat.dataRows, '');
  const cdSai = (doi) => h.kiemCaiDatSua_(Object.assign({ tableName: 'X', sourceType: 'docLap', inputCols: 'C' }, doi)).loi;
  assert.ok(cdSai({ inputCols: 'C-J' }).includes('Cột được nhập'));
  assert.ok(cdSai({ lockedRows: 'năm' }).includes('Dòng khoá'));
  assert.ok(cdSai({ dataRows: '-1' }).includes('Số dòng sẵn'));
  assert.ok(cdSai({ lockDay: '40' }).includes('Tự khoá'));
  assert.ok(cdSai({ hiddenCols: 'B-D' }).includes('Cột ẩn'));
  assert.equal(kq.caiDat.periodMode, 'nhapMoi');
  const cdDung = (doi) => h.kiemCaiDatSua_(Object.assign({ tableName: 'X', sourceType: 'docLap', inputCols: 'C' }, doi)).caiDat;
  assert.equal(cdDung({ hiddenCols: ' b, d:e ' }).hiddenCols, 'B, D:E');
  assert.equal(cdDung({ periodMode: 'capNhat' }).periodMode, 'capNhat');
  assert.equal(cdDung({ periodMode: 'la' }).periodMode, 'nhapMoi');
  assert.equal(kq.caiDat.shareType, 'moi');                              // bảng công khai (b07)
  assert.equal(cdDung({ shareType: 'congKhai' }).shareType, 'congKhai');
  assert.equal(kq.caiDat.aggregateKeep, 'congThuc');                     // tổng hợp giữ công thức (b08)
  assert.equal(cdDung({ aggregateKeep: 'giaTri' }).aggregateKeep, 'giaTri');
  assert.equal(cdDung({ aggregateKeep: 'la' }).aggregateKeep, 'congThuc');
  assert.equal(cdDung({ shareType: 'la' }).shareType, 'moi');
  assert.equal(kq.caiDat.lockDay, '');
  assert.equal(h.kiemCaiDatSua_({ tableName: 'X', sourceType: 'docLap', inputCols: 'C', lockDay: '5' }).caiDat.lockDay, 5);
  assert.equal(sach(h.kiemCaiDatSua_({ tableName: 'X', sourceType: 'docLap', aggregateType: 'tong', inputCols: 'C' })).caiDat.sourceType, 'gopTach');
  assert.equal(kq.caiDat.byUnitCols, '');                                // Ghép cột (b11)
  assert.equal(cdDung({ aggregateType: 'cot', byUnitCols: ' e:j ' }).byUnitCols, 'E:J');
  assert.equal(cdDung({ aggregateType: 'cot' }).sourceType, 'gopTach');
  assert.ok(cdSai({ byUnitCols: 'E-J' }).includes('Cột ghép theo đơn vị'));
});

const cd = (doi) => Object.assign({ sourceType: 'gopTach', inputCols: 'C:D', inputRows: '', lockedRows: '', noteTabs: [], dataRows: '' }, doi);
const mau = (doi) => Object.assign({ cotA: ['Bảng', 'Mã đơn vị', 'DV1', '', 'DV2'], soCot: 5, tenTab: ['Mẫu', 'Chú thích'], oLoi: [] }, doi);
const cho = (ds) => sach(ds).map((l) => l.cho + ' | ' + l.loi);

bai('kiểm mẫu: mã all — bảng ghép nhận all, bảng tổng chỉ nhận all', () => {
  const m = mau({ cotA: ['Bảng', 'Mã đơn vị', 'all', '', 'DV1'] });
  assert.deepEqual(cho(h.kiemMau_(m, cd(), ['DV1'])), []);
  assert.deepEqual(cho(h.kiemMau_(m, cd({ aggregateType: 'tong' }), ['DV1'])),
    ['Cột A dòng 5 | Bảng tổng các đơn vị mà dòng ghi mã riêng']);
  assert.deepEqual(cho(h.kiemMau_(m, cd({ aggregateType: 'cot' }), ['DV1'])),
    ['Cột A dòng 5 | Bảng tổng các đơn vị mà dòng ghi mã riêng']);
  assert.deepEqual(cho(h.kiemMau_(mau({ cotA: ['Bảng', 'Mã đơn vị', ''] }), cd({ aggregateType: 'tong' }), [])),
    ['Cột A | Chưa có dòng nào ghi all']);
  assert.deepEqual(cho(h.kiemMau_(mau({ cotA: ['Bảng', 'Mã đơn vị'] }), cd({ aggregateType: 'tong', sourceType: 'docLap', dataRows: 5 }), [])),
    ['Cài đặt | Bảng tổng các đơn vị mà đơn vị tự nhập dòng']);
});

bai('tách dòng: giữ dòng của đơn vị + dòng all', () => {
  const cotA = ['T', 'Mã đơn vị', 'DV1', 'all', 'DV2', '', 'all'];
  assert.deepEqual(sach(h.dongGiuLai_(cotA, 2, 'DV1', true)), [3, 4, 7]);
  assert.deepEqual(sach(h.dongGiuLai_(cotA, 2, 'DV3', true)), [4, 7]);
  assert.deepEqual(sach(h.dongGiuLai_(cotA, 2, 'DV3', false)), [3, 4, 5, 6, 7]);
});

bai('đọc mã đơn vị ở cột A để giao bảng', () => {
  const kq = sach(h.maTrongMau_(['Bảng', 'Mã đơn vị', 'DV2', 'all', 'DV1', 'DV2', '', 'XX', 'XX', 5], ['DV1', 'DV2']));
  assert.deepEqual(kq, { ma: ['DV2', 'DV1'], coAll: true, sai: ['XX', '5'] });
  assert.deepEqual(sach(h.maTrongMau_(['Bảng', 'Không tiêu đề'], ['DV1'])), { ma: [], coAll: false, sai: [] });
});

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
    mau({ cotA: ['Bảng', 'Mã đơn vị', 'DV1', 'XX', 'XX'], oLoi: [{ cot: 5, dong: 3, giaTri: '#NAME?' }, { cot: 5, dong: 4, giaTri: '#NAME?' }, { cot: 5, dong: 5, giaTri: '#NAME?' }, { cot: 5, dong: 5, giaTri: '#REF!' }] }),
    cd({ inputCols: 'A, D:G', inputRows: '2, 3:9', noteTabs: ['Chú thích', 'Căn cứ', 'Mẫu'] }), ['DV1']));
  assert.deepEqual(kq, [
    'Cột được nhập | Có cột A',
    'Cột được nhập | Cột F, G nằm ngoài bảng',
    'Dòng được nhập | Dòng 2, 6–9 không phải dòng dữ liệu',
    'Cột A dòng 4–5 | Mã "XX" không có trong danh mục đơn vị',
    'Tab chú thích | Không có tab "Căn cứ"',
    'Tab chú thích | "Mẫu" đang là tab đầu',
    'Cột E dòng 3–5 | Công thức báo #NAME?',
    'Cột E dòng 5 | Công thức báo #REF!'
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
  assert.deepEqual(sach(h.dongBangMoi_(['tableCode', 'tableName', 'noteTabs'], ['a', 'Cũ', 'X'], { tableName: 'Mới' })),
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
    allowAddRows: true, noteTabs: 'X, Y', dataRows: '20', aggregateType: 'ghep', lockDay: '',
    hiddenCols: '', periodMode: 'nhapMoi', shareType: 'moi', aggregateKeep: 'congThuc', byUnitCols: '' });
});

bai('tải Excel: mã bảng, file .xlsx, cỡ file, cài đặt như Sửa', () => {
  const kb = { tableCode: 'bttdc_duan', tableName: 'Tiến độ dự án', sourceType: 'gopTach',
    inputCols: 'o:s, v', noteTabs: 'Chú thích', tenFile: 'mau.XLSX', duLieu: 'QUJD', dataRows: '99' };
  const kq = sach(h.kiemKhaiTaiMau_(kb, ['khac']));
  assert.equal(kq.tableCode, 'bttdc_duan');
  assert.equal(kq.caiDat.inputCols, 'O:S, V');
  assert.equal(kq.caiDat.noteTabs, 'Chú thích');
  assert.equal(kq.caiDat.dataRows, '');
  assert.equal(kq.caiDat.allowAddRows, false);
  const sai = (doi, dsMa) => h.kiemKhaiTaiMau_(Object.assign({}, kb, doi), dsMa || []).loi;
  assert.match(sai({}, ['BTTDC_duan']), /đã có/);
  assert.match(sai({ tableCode: 'Bảng' }), /chữ thường/);
  assert.match(sai({ duLieu: '' }), /Chưa chọn file/);
  assert.match(sai({ tenFile: 'mau.xls' }), /\.xlsx/);
  assert.match(sai({ duLieu: 'A'.repeat(15 * 1048576) }), /quá lớn/);
  assert.match(sai({ inputCols: '' }), /Cột được nhập/);
});

bai('tải Excel: cách sửa chỉ về file Excel', () => {
  const kq = sach(h.loiChoExcel_([
    { cho: 'Cột A dòng 5', loi: 'Mã "X" không có trong danh mục đơn vị', cach: 'Chọn mã trong danh sách của ô' },
    { cho: 'Cột G dòng 5', loi: 'Công thức báo #NAME?', cach: 'Sửa công thức trong file tổng (…)' }
  ]));
  assert.equal(kq[0].cach, 'Sửa mã trong file Excel, hoặc thêm đơn vị ở mục Tài khoản');
  assert.equal(kq[1].cach, 'Sửa công thức trong file Excel (…)');
  assert.equal(kq[1].cho, 'Cột G dòng 5');
});

console.log('kiem-gas-bang: ' + soBai + ' bài đạt');
