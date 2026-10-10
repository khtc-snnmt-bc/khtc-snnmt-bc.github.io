// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-ky.mjs
// Vai trò  : Kiểm hàm thuần Kỳ báo cáo phía GAS (tên kỳ, sổ kỳ, giao của bảng, kế hoạch khoá, tự khoá, kỳ cập nhật,
//            bảng công khai)
// Chạy     : node app/kiem-thu/kiem-gas-ky.mjs
// Phiên bản: 0.5.1 · Cập nhật: 10/10/2026 16:10
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('DangNhap.js') + '\n' + doc('QuanTri.js') + '\n' + doc('PhanQuyen.js') + '\n' + doc('KyBaoCao.js') +
  '\n;this.ham = { chuanHoaTenKy_, docKyQuanLy_, dongKy_, giaoCuaBangKy_, docCaiDat_, keHoachKhoa_,' +
  ' fileTrongPhamVi_, docBangQuanLy_, themToanQuyen_, docFileQuanLy_, ngayKhoaThang_, hanKhoaMacDinh_, kyDenHan_, docHanKhoaGui_,' +
  ' loiKhongCoDong_, kyTruoc_, cotAn_, cotKhung_, dauDong_, ghepDongCapNhat_,' +
  ' bangCoKyMo_, laCongKhai_, fileCongKhai_, chenhLechCongKhai_, bangCongKhaiCuaDonVi_ };', sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

bai('loiKhongCoDong_: đơn vị không có dòng ở cột A mẫu → báo, không tạo file', () => {
  const cotA = ['Tên bảng', 'Mã đơn vị', 'A', 'A', 'B'];
  assert.equal(h.loiKhongCoDong_(cotA, 'A'), '');
  assert.match(h.loiKhongCoDong_(cotA, 'KHTC'), /không có dòng nào/);
  assert.equal(h.loiKhongCoDong_(cotA.concat(['all']), 'KHTC'), '');   // dòng chung mọi đơn vị
});

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
    ['unitCode', 'tableCode', 'fileId', 'createdAt', 'access'],
    ['A', 'duan', 'F_A', 'ngay'],
    ['A', 'khokhan', 'F_A_KK', 'ngay'],
    ['C', 'duan', '', '', 'xem'],
    ['', 'duan', 'X', '']
  ];
  assert.deepEqual(sach(h.giaoCuaBangKy_(tabFile, 'duan')), [
    { unitCode: 'A', fileId: 'F_A', dong: 2, access: 'sua' },
    { unitCode: 'C', fileId: '', dong: 4, access: 'xem' }
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
  const bang = h.themToanQuyen_(h.docBangQuanLy_([['tableCode', 'tableName', 'templateFileId'],
    ['duan', 'Dự án', 'TONG']]), ['QL']);
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

bai('kiểu kỳ + cột ẩn đọc từ tab Bảng', () => {
  assert.equal(h.docCaiDat_(['tableCode'], ['x']).periodMode, 'nhapMoi');
  assert.equal(h.docCaiDat_(['tableCode', 'periodMode', 'hiddenCols'], ['x', ' capNhat ', ' B ']).periodMode, 'capNhat');
  assert.equal(h.docCaiDat_(['tableCode', 'hiddenCols'], ['x', ' B ']).hiddenCols, 'B');
  assert.equal(h.docCaiDat_(['tableCode'], ['x']).shareType, 'moi');
  assert.equal(h.docCaiDat_(['tableCode', 'shareType'], ['x', ' congKhai ']).shareType, 'congKhai');
});

bai('kỳ trước = tab ngày gần nhất trước kỳ mới', () => {
  const ten = ['10.09.2026', 'Chú thích', '10.10.2026', '10.12.2026', 'Trang tính1'];
  assert.equal(h.kyTruoc_(ten, '10.11.2026'), '10.10.2026');
  assert.equal(h.kyTruoc_(ten, '01.01.2027'), '10.12.2026');
  assert.equal(h.kyTruoc_(ten, '10.09.2026'), '');
  assert.equal(h.kyTruoc_(['Chú thích'], '10.11.2026'), '');
});

bai('cột ẩn: luôn có A, bỏ cột quá bảng', () => {
  assert.deepEqual(sach(h.cotAn_({ hiddenCols: '' }, 10)), [[1, 1]]);
  assert.deepEqual(sach(h.cotAn_({ hiddenCols: 'B, D:E, Z' }, 10)), [[1, 2], [4, 5]]);
  assert.deepEqual(sach(h.cotAn_({ hiddenCols: 'A' }, 10)), [[1, 1]]);
});

bai('cột khung: không cột nhập, không cột có công thức', () => {
  const ct = [['', '', '', '=C3*2', ''], ['', '', '', '', '']];
  assert.deepEqual(sach(h.cotKhung_({ inputCols: 'C' }, ct, 5)), [1, 2, 5]);
});

bai('ghép kỳ cập nhật: giữ dòng cũ, dòng mẫu mới chèn sau khối của Sở', () => {
  // dòng tiêu đề 2; kỳ trước: dòng 3 'A|DA1', 4 'A|DA2', 5 dòng đơn vị tự thêm
  const dau = (r) => h.dauDong_(r, [1, 2], 'A');
  assert.equal(dau(['all', 'DA1']), dau(['A', 'DA1']));
  const g = h.ghepDongCapNhat_(
    [{ dong: 3, dau: dau(['A', 'DA1']) }, { dong: 4, dau: dau(['all', 'DA2']) }, { dong: 9, dau: dau(['A', 'DA3']) }],
    [dau(['A', 'DA1']), dau(['A', 'DA2']), dau(['A', 'tự thêm'])], 2);
  assert.deepEqual(sach(g), { anhXa: { 3: 3, 4: 4, 9: 5 }, dongMoi: [9], chenSau: 4 });
  // không dòng mới
  const g2 = h.ghepDongCapNhat_([{ dong: 3, dau: 'x' }], ['x'], 2);
  assert.deepEqual(sach(g2), { anhXa: { 3: 3 }, dongMoi: [], chenSau: 3 });
  // hai dòng mẫu trùng dấu → khớp lần lượt, không dùng một dòng hai lần
  const g3 = h.ghepDongCapNhat_([{ dong: 3, dau: 'x' }, { dong: 4, dau: 'x' }], ['x'], 2);
  assert.deepEqual(sach(g3), { anhXa: { 3: 3, 4: 4 }, dongMoi: [4], chenSau: 3 });
});

// ---------- Bảng công khai (b07) ----------
const bangCK = [['tableCode', 'tableName', 'group', 'shareType'],
  ['ck', 'Công khai', 'TC', 'congKhai'], ['kin', 'Kín', 'TC', 'moi']];
const fileCK = [['unitCode', 'tableCode', 'fileId', 'createdAt', 'access'],
  ['A', 'ck', 'F_A_CK', '', ''], ['B', 'ck', 'F_B_CK', '', 'xem'], ['C', 'ck', '', '', 'sua'],
  ['A', 'kin', 'F_A_KIN', '', 'sua']];
const kyCK = (khoa) => [['tableCode', 'periodName', 'locked'], ['ck', '01.10.2026', true], ['ck', '01.11.2026', khoa],
  ['kin', '01.11.2026', false]];

bai('công khai: chỉ bảng congKhai + đơn vị được nhập + còn kỳ mở', () => {
  const ky = h.docKyQuanLy_(kyCK(false));
  assert.equal(h.bangCoKyMo_(ky, 'ck'), true);
  assert.equal(h.bangCoKyMo_(ky, 'ck', '01.11.2026'), false);   // khoá / xoá kỳ mở cuối cùng
  assert.equal(h.laCongKhai_('congKhai', 'sua', true), true);
  assert.equal(h.laCongKhai_('congKhai', 'xem', true), false);
  assert.equal(h.laCongKhai_('congKhai', 'sua', false), false);
  assert.equal(h.laCongKhai_('moi', 'sua', true), false);
  const bang = h.docBangQuanLy_(bangCK), file = h.docFileQuanLy_(fileCK);
  assert.deepEqual(sach(h.fileCongKhai_(bang, file, ky)), { F_A_CK: true });
  assert.deepEqual(sach(h.fileCongKhai_(bang, file, h.docKyQuanLy_(kyCK(true)))), {});
});

bai('chenhLechCongKhai_: thêm / đổi / gỡ quyền "bất kỳ ai"', () => {
  const u = { id: 'u1', type: 'user', role: 'writer' };
  assert.deepEqual(sach(h.chenhLechCongKhai_(true, [u])), { them: true, doi: [], go: [] });
  assert.deepEqual(sach(h.chenhLechCongKhai_(true, [u, { id: 'any', type: 'anyone', role: 'writer' }])), { them: false, doi: [], go: [] });
  assert.deepEqual(sach(h.chenhLechCongKhai_(true, [{ id: 'any', type: 'anyone', role: 'reader' }])), { them: false, doi: ['any'], go: [] });
  assert.deepEqual(sach(h.chenhLechCongKhai_(false, [u, { id: 'any', type: 'anyone', role: 'writer' }])), { them: false, doi: [], go: ['any'] });
  assert.deepEqual(sach(h.chenhLechCongKhai_(false, [u])), { them: false, doi: [], go: [] });
});

bai('bangCongKhaiCuaDonVi_: vào không cần Gmail chỉ thấy bảng công khai đang mở', () => {
  assert.deepEqual(sach(h.bangCongKhaiCuaDonVi_(bangCK, fileCK, kyCK(false), 'A')),
    [{ tableCode: 'ck', tableName: 'Công khai', fileId: 'F_A_CK' }]);
  assert.deepEqual(sach(h.bangCongKhaiCuaDonVi_(bangCK, fileCK, kyCK(true), 'A')), []);
  assert.deepEqual(sach(h.bangCongKhaiCuaDonVi_(bangCK, fileCK, kyCK(false), 'B')), []);   // chỉ xem
  assert.deepEqual(sach(h.bangCongKhaiCuaDonVi_(bangCK, fileCK, kyCK(false), 'C')), []);   // chưa có file
  assert.deepEqual(sach(h.bangCongKhaiCuaDonVi_(bangCK, fileCK, kyCK(false), '')), []);
});

console.log('kiem-gas-ky: ' + soBai + ' bài ĐẠT');
