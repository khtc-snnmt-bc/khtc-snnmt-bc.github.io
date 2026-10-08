// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-phan-quyen.mjs
// Vai trò  : Kiểm hàm thuần Tài khoản / Phân quyền / quyền Drive mong muốn phía GAS
// Chạy     : node app/kiem-thu/kiem-gas-phan-quyen.mjs
// Phiên bản: 0.4.1 · Cập nhật: 08/10/2026 22:33
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
  ' danhSachBangDangNhap_, laTaiKhoanQuanTri_, donViToanQuyen_, themToanQuyen_, kiemQuyenGiao_ };', sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

// Dữ liệu giả lập Sheet quản lý (tab Bảng có cột managerUnits ở CUỐI, như khi GAS tự thêm)
const tabBang = [
  ['tableCode', 'tableName', 'group', 'periodType', 'templateFileId', 'noteTabs', 'managerUnits'],
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
  assert.deepEqual(sach(bang[0]), { tableCode: 'duan', tableName: 'Tiến độ dự án', group: 'BTTDC', templateFileId: 'TONG_DUAN', managerUnits: ['QL'], shareType: 'moi' });
  // Tab Bảng cũ chưa có cột managerUnits → danh sách rỗng
  const cu = h.docBangQuanLy_([['tableCode', 'tableName', 'group'], ['x', 'X', 'G']]);
  assert.deepEqual(sach(cu[0].managerUnits), []);
  assert.equal(cu[0].templateFileId, '');
  // Nhiều đơn vị quản lý trong một ô, bỏ trùng / khoảng trắng
  const nhieu = h.docBangQuanLy_([['tableCode', 'managerUnits'], ['x', ' QL, KHTC ,,QL']]);
  assert.deepEqual(sach(nhieu[0].managerUnits), ['QL', 'KHTC']);
});

bai('nhiều đơn vị quản lý: cả hai cùng được quyền, cùng thấy bảng', () => {
  const tb = [tabBang[0], ['duan', 'Tiến độ dự án', 'BTTDC', 'thang', 'TONG_DUAN', '', 'QL, KHTC']];
  const b2 = h.docBangQuanLy_(tb);
  const m = sach(h.quyenMongMuon_(b2, file, emailDv));
  assert.deepEqual(m.TONG_DUAN, { 'ql@x.com': 'reader', 'qt@x.com': 'reader' });
  assert.equal(m.F_B_DUAN['qt@x.com'], 'writer');
  assert.deepEqual(sach(h.fileTrongPhamVi_(b2, file, { unitCodes: ['KHTC'] })), ['TONG_DUAN', 'F_A_DUAN', 'F_B_DUAN']);
  assert.equal(h.bangQuanLyCuaDonVi_(tb, tabFile, tabDV, 'KHTC').length, 1);
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
  assert.equal(m.TONG_KK, undefined); // không có quản lý → không ai được chia sẻ (dongBoQuyen_ coi như {})
});

bai('quyenMongMuon_: Gmail vừa là quản lý vừa thuộc đơn vị → SỬA thắng XEM', () => {
  const ed = { A: ['ql@x.com'], QL: ['ql@x.com'] };
  const b2 = [{ tableCode: 't', templateFileId: 'T', managerUnits: ['QL'] }];
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

bai('capNhatGiao_: thêm dòng mới, bỏ dòng chưa có file, đã có file thì giữ dòng với access = khong', () => {
  const g = sach(h.capNhatGiao_(tabFile, 'duan', { A: 'sua', D: 'xem' }));
  const duan = g.dong.filter((r) => r[1] === 'duan');
  assert.deepEqual(duan.map((r) => r[0]), ['A', 'B', 'D']);       // C (chưa có file) bị bỏ giao
  assert.deepEqual(duan.find((r) => r[0] === 'B'), ['B', 'duan', 'F_B_DUAN', 'ngay', 'khong']);
  assert.deepEqual(duan.find((r) => r[0] === 'D'), ['D', 'duan', '', '', 'xem']);
  assert.ok(g.dong.some((r) => r[1] === 'khokhan'));              // bảng khác giữ nguyên
  assert.ok(g.dong.every((r) => r.length === 5));
});

bai('access: khong → không thấy file, không chia quyền; xem → chỉ XEM', () => {
  const tf = [tabFile[0], ['A', 'duan', 'F_A_DUAN', 'ngay', 'khong'], ['B', 'duan', 'F_B_DUAN', 'ngay', 'xem']];
  const f = h.docFileQuanLy_(tf);
  assert.deepEqual(sach(f.map((x) => x.access)), ['khong', 'xem']);
  assert.equal(h.docFileQuanLy_(tabFile)[0].access, 'sua');      // tab cũ chưa có cột → sua
  const m = sach(h.quyenMongMuon_(bang, f, emailDv));
  assert.deepEqual(m.F_A_DUAN, { 'ql@x.com': 'writer' });         // quản lý vẫn sửa
  assert.equal(m.F_B_DUAN['b1@x.com'], 'reader');
  assert.equal(h.danhSachBangDangNhap_(tabBang, tf, tabDV, 'A').length, 0);
  assert.equal(h.danhSachBangDangNhap_(tabBang, tf, tabDV, 'B').length, 1);
  assert.match(h.kiemQuyenGiao_(['A']).loi, /không hợp lệ/);
  assert.match(h.kiemQuyenGiao_({ A: 'vua' }).loi, /không hợp lệ/);
  assert.deepEqual(sach(h.kiemQuyenGiao_({ ' A ': 'xem' }).quyen), { A: 'xem' });
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

bai('đơn vị nhóm Quản trị (Quản trị / Quản lý báo cáo) thấy và sửa mọi bảng', () => {
  const dv = [['unitCode', 'unitName', 'region', 'role'], ['A', 'Ban Ả', '', 'Đơn vị báo cáo'],
    ['KHTC', 'Phòng KHTC', '', 'Quản trị'], ['QLBC', 'Phòng QLBC', '', 'Quản lý báo cáo']];
  assert.deepEqual(sach(h.donViToanQuyen_(dv)), ['KHTC', 'QLBC']);
  const ds = sach(h.danhSachBangDangNhap_(tabBang, tabFile, dv, 'KHTC'));
  assert.deepEqual(ds.map((b) => b.tableCode), ['duan', 'khokhan']);   // cả bảng chưa ai quản lý
  assert.deepEqual(ds[1].donVi.map((d) => d.unitCode), ['A']);
  assert.equal(h.bangQuanLyCuaDonVi_(tabBang, tabFile, dv, 'A').length, 0);
  const b2 = h.themToanQuyen_(bang, h.donViToanQuyen_(dv));
  assert.deepEqual(sach(bang[0].managerUnits), ['QL']);                 // bản gốc không đổi
  const ed = Object.assign({}, emailDv, { QLBC: ['qlbc@x.com'] });
  const m = sach(h.quyenMongMuon_(b2, file, ed));
  assert.equal(m.F_A_KK['qt@x.com'], 'writer');
  assert.equal(m.F_B_DUAN['qlbc@x.com'], 'writer');
  assert.equal(m.TONG_KK['qt@x.com'], 'reader');
  assert.deepEqual(sach(h.fileTrongPhamVi_(b2, file, { unitCodes: ['KHTC'] })),
    ['TONG_DUAN', 'TONG_KK', 'F_A_DUAN', 'F_B_DUAN', 'F_A_KK']);
});

console.log('ĐẠT ' + soBai + ' bài — kiem-gas-phan-quyen');
