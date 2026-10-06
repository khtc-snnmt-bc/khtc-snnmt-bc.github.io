// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-phan-quyen.mjs
// Vai trò  : Kiểm hàm thuần Tài khoản / Phân quyền / quyền Drive mong muốn phía GAS
// Chạy     : node app/kiem-thu/kiem-gas-phan-quyen.mjs
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 20:54
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('DangNhap.js') + '\n' + doc('QuanTri.js') + '\n' + doc('PhanQuyen.js') +
  '\n;this.ham = { docBangQuanLy_, docFileQuanLy_, emailTheoDonVi_, fileTrongPhamVi_, quyenMongMuon_,' +
  ' chenhLechQuyen_, kiemDsTaiKhoan_, thayTaiKhoanDonVi_, capNhatGiao_, bangQuanLyCuaDonVi_,' +
  ' danhSachBangDangNhap_, laTaiKhoanQuanTri_ };', sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

// Dữ liệu giả lập Sheet quản lý (tab Bảng có cột managerUnit ở CUỐI, như khi GAS tự thêm)
const tabBang = [
  ['tableCode', 'tableName', 'group', 'periodType', 'templateFileId', 'noteTabs', 'managerUnit'],
  ['duan', 'Tiến độ dự án', 'BTTDC', 'thang', 'TONG_DUAN', '', 'QL'],
  ['khokhan', 'Khó khăn', 'BTTDC', 'thang', 'TONG_KK', '', ''],
  ['', '', '', '', '', '', '']
];
const tabFile = [
  ['unitCode', 'tableCode', 'fileId', 'createdAt'],
  ['A', 'duan', 'F_A_DUAN', 'ngay'],
  ['B', 'duan', 'F_B_DUAN', 'ngay'],
  ['A', 'khokhan', 'F_A_KK', 'ngay'],
  ['C', 'duan', '', '']
];
const tabTK = [
  ['email', 'unitCode', 'role'],
  ['a1@x.com', 'A', 'Nhập liệu'],
  ['A2@X.com ', 'A', 'Nhập liệu'],
  ['b1@x.com', 'B', 'Nhập liệu'],
  ['ql@x.com', 'QL', 'Quản lý báo cáo'],
  ['qt@x.com', 'KHTC', 'Quản trị']
];
const tabDV = [['unitCode', 'unitName'], ['A', 'Ban Ả'], ['B', 'Ban Bình'], ['QL', 'Phòng QL']];

const bang = h.docBangQuanLy_(tabBang);
const file = h.docFileQuanLy_(tabFile);
const emailDv = h.emailTheoDonVi_(tabTK);

bai('docBangQuanLy_ đọc cột theo tên, bỏ dòng trống', () => {
  assert.equal(bang.length, 2);
  assert.deepEqual(sach(bang[0]), { tableCode: 'duan', tableName: 'Tiến độ dự án', group: 'BTTDC', templateFileId: 'TONG_DUAN', managerUnit: 'QL' });
  // Tab Bảng cũ chưa có cột managerUnit → để trống
  const cu = h.docBangQuanLy_([['tableCode', 'tableName', 'group'], ['x', 'X', 'G']]);
  assert.equal(cu[0].managerUnit, '');
  assert.equal(cu[0].templateFileId, '');
});

bai('emailTheoDonVi_ chuẩn hoá Gmail', () => {
  assert.deepEqual(sach(emailDv.A), ['a1@x.com', 'a2@x.com']);
});

bai('quyenMongMuon_: đơn vị + quản lý SỬA file đơn vị, quản lý chỉ XEM file tổng', () => {
  const m = sach(h.quyenMongMuon_(bang, file, emailDv));
  assert.deepEqual(m.F_A_DUAN, { 'a1@x.com': 'writer', 'a2@x.com': 'writer', 'ql@x.com': 'writer' });
  assert.deepEqual(m.F_B_DUAN, { 'b1@x.com': 'writer', 'ql@x.com': 'writer' });
  assert.deepEqual(m.F_A_KK, { 'a1@x.com': 'writer', 'a2@x.com': 'writer' }); // bảng chưa có quản lý
  assert.deepEqual(m.TONG_DUAN, { 'ql@x.com': 'reader' });
  assert.deepEqual(m.TONG_KK, {}); // không có quản lý → không ai được chia sẻ file tổng
});

bai('quyenMongMuon_: Gmail vừa là quản lý vừa thuộc đơn vị → SỬA thắng XEM', () => {
  const ed = { A: ['ql@x.com'], QL: ['ql@x.com'] };
  const b2 = [{ tableCode: 't', templateFileId: 'T', managerUnit: 'QL' }];
  const m = sach(h.quyenMongMuon_(b2, [{ unitCode: 'A', tableCode: 't', fileId: 'T' }], ed));
  assert.equal(m.T['ql@x.com'], 'writer');
});

bai('fileTrongPhamVi_: đổi tài khoản đơn vị quản lý kéo theo mọi file của bảng nó quản lý', () => {
  assert.deepEqual(sach(h.fileTrongPhamVi_(bang, file, { unitCodes: ['B'] })), ['F_B_DUAN']);
  assert.deepEqual(sach(h.fileTrongPhamVi_(bang, file, { unitCodes: ['QL'] })), ['TONG_DUAN', 'F_A_DUAN', 'F_B_DUAN']);
  assert.deepEqual(sach(h.fileTrongPhamVi_(bang, file, { tableCodes: ['khokhan'] })), ['TONG_KK', 'F_A_KK']);
});

bai('chenhLechQuyen_: thêm / đổi / gỡ, không đụng chủ file và quyền không phải user', () => {
  const c = sach(h.chenhLechQuyen_({ 'a@x.com': 'writer', 'b@x.com': 'reader', 'chu@x.com': 'writer' }, [
    { id: '1', emailAddress: 'chu@x.com', role: 'owner', type: 'user' },
    { id: '2', emailAddress: 'B@x.com', role: 'writer', type: 'user' },
    { id: '3', emailAddress: 'cu@x.com', role: 'writer', type: 'user' },
    { id: '4', role: 'writer', type: 'anyone' }
  ]));
  assert.deepEqual(c.them, [{ email: 'a@x.com', role: 'writer' }]);
  assert.deepEqual(c.doi, [{ id: '2', email: 'b@x.com', role: 'reader' }]);
  assert.deepEqual(c.go, [{ id: '3', email: 'cu@x.com' }]);
});

bai('kiemDsTaiKhoan_', () => {
  assert.deepEqual(sach(h.kiemDsTaiKhoan_([{ email: ' A@X.com ', role: 'Nhập liệu' }, { email: '' }])).ds,
    [{ email: 'a@x.com', role: 'Nhập liệu' }]);
  assert.match(h.kiemDsTaiKhoan_([{ email: 'abc' }]).loi, /không đúng dạng/);
  assert.match(h.kiemDsTaiKhoan_([{ email: 'a@x.com' }, { email: 'A@x.com' }]).loi, /lặp/);
  assert.match(h.kiemDsTaiKhoan_([{ email: 'a@x.com', role: 'Vua' }]).loi, /không hợp lệ/);
  assert.ok(h.kiemDsTaiKhoan_(null).loi);
});

bai('thayTaiKhoanDonVi_ giữ đơn vị khác, thay dòng đơn vị đã chọn', () => {
  const d = sach(h.thayTaiKhoanDonVi_(tabTK, 'A', [{ email: 'moi@x.com', role: 'Nhập liệu' }]));
  assert.equal(d.length, 4);
  assert.deepEqual(d[d.length - 1], ['moi@x.com', 'A', 'Nhập liệu']);
  assert.ok(!d.some((r) => r[0] === 'a1@x.com'));
  // Gỡ hết Quản trị của chính mình → phát hiện được
  const d2 = h.thayTaiKhoanDonVi_(tabTK, 'KHTC', []);
  assert.equal(h.laTaiKhoanQuanTri_([['h']].concat(d2), 'qt@x.com', 'KHTC'), false);
});

bai('capNhatGiao_: thêm dòng chưa có file, bỏ dòng chưa có file, giữ dòng đã có file', () => {
  const g = sach(h.capNhatGiao_(tabFile, 'duan', ['A', 'D']));
  assert.deepEqual(g.giuLai, ['B']);
  const duan = g.dong.filter((r) => r[1] === 'duan').map((r) => r[0]);
  assert.deepEqual(duan, ['A', 'B', 'D']);          // C (chưa có file) bị bỏ giao
  assert.deepEqual(g.dong.find((r) => r[0] === 'D'), ['D', 'duan', '', '']);
  assert.ok(g.dong.some((r) => r[1] === 'khokhan')); // bảng khác giữ nguyên
  assert.ok(g.dong.every((r) => r.length === 4));
});

bai('bangQuanLyCuaDonVi_ / danhSachBangDangNhap_', () => {
  const ql = sach(h.bangQuanLyCuaDonVi_(tabBang, tabFile, tabDV, 'QL'));
  assert.equal(ql.length, 1);
  assert.equal(ql[0].fileId, 'TONG_DUAN');
  assert.deepEqual(ql[0].donVi.map((d) => d.unitCode), ['A', 'B']); // C chưa có file → không hiện
  assert.equal(ql[0].donVi[0].unitName, 'Ban Ả');
  assert.deepEqual(sach(h.bangQuanLyCuaDonVi_(tabBang, tabFile, tabDV, '')), []);
  const dsA = sach(h.danhSachBangDangNhap_(tabBang, tabFile, tabDV, 'A'));
  assert.deepEqual(dsA.map((b) => b.fileId), ['F_A_DUAN', 'F_A_KK']);
  assert.equal(dsA[0].donVi, undefined);
});

console.log('ĐẠT ' + soBai + ' bài — kiem-gas-phan-quyen');
