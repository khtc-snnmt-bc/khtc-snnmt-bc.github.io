// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-tong-hop.mjs
// Vai trò  : Kiểm hàm thuần Tổng hợp kỳ phía GAS (khớp dòng đơn vị, bảng Ghép, bảng Cộng)
// Chạy     : node app/kiem-thu/kiem-gas-tong-hop.mjs
// Phiên bản: 0.4.0 · Cập nhật: 10/10/2026 20:40
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const doc = (f) => readFileSync(new URL('../gas/' + f, import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(doc('DangNhap.js') + '\n' + doc('QuanTri.js') + '\n' + doc('PhanQuyen.js') + '\n' + doc('KyBaoCao.js') +
  '\n' + doc('TongHop.js') +
  '\n;this.ham = { luuGiaTri_, docGiaTri_, dongNhapMau_, khopDongDv_, keHoachGhep_, khoiGhep_, khoiTong_, demKhongKhop_, congThucLienKet_, chuanGiuTongHop_, bangTheoDonVi_, locChuTri_, cotChuTri_, cotToanChu_, congThucTp_, dichCongThucTp_, cotTp_ };',
  sandbox);
const h = sandbox.ham;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

bai('ô ngày qua bộ đệm JSON vẫn là ngày', () => {
  const ngay = new Date(2026, 9, 10);
  const lai = h.docGiaTri_(JSON.parse(JSON.stringify(h.luuGiaTri_(ngay))));
  assert.equal(lai.getTime(), ngay.getTime());
  assert.equal(h.docGiaTri_(h.luuGiaTri_(5)), 5);
  assert.equal(h.docGiaTri_(''), '');
});

bai('dòng nhập của mẫu: khai inputRows, trừ lockedRows; không khai = mọi dòng dữ liệu', () => {
  assert.deepEqual(sach(h.dongNhapMau_({}, 2, 6)), [3, 4, 5, 6]);
  assert.deepEqual(sach(h.dongNhapMau_({ lockedRows: '6' }, 2, 6)), [3, 4, 5]);
  assert.deepEqual(sach(h.dongNhapMau_({ inputRows: '1:5', lockedRows: '4' }, 2, 6)), [3, 5]);
});

bai('khớp dòng đơn vị: theo dấu, theo thứ tự; dòng có chữ không khớp là thừa', () => {
  const k = h.khopDongDv_(
    [{ dong: 3, dau: 'A␟DA1' }, { dong: 5, dau: 'A␟DA2' }, { dong: 7, dau: 'A␟DA3' }],
    [{ dau: 'A␟DA2', coChu: true }, { dau: 'A␟DA1', coChu: true }, { dau: 'A␟', coChu: true }, { dau: 'A␟', coChu: false }]);
  assert.deepEqual(sach(k), { anhXa: { 3: 1, 5: 0 }, thua: [2] });
});

// Mẫu bảng Ghép (Sở giao dòng): dòng 1 tên bảng, dòng 2 tiêu đề, dòng 3–6 dữ liệu.
// Cột: A mã · B tên dự án · C số (nhập) · D = C*2 (công thức)
const mauGhep = {
  dongTieuDe: 2, soCot: 4,
  cotA: ['Bảng', 'Mã đơn vị', 'A', 'B', 'all', ''],
  gt: [['A', 'DA1', '', 0], ['B', 'DA2', '', 0], ['all', 'Chung', '', 0], ['', 'Cộng', '', 0]],
  ct: [['', '', '', 'R1C1x'], ['', '', '', 'R1C1x'], ['', '', '', 'R1C1x'], ['', '', 'TONG', 'R1C1x']]
};
// Đơn vị A: dòng 0 = DA1, dòng 1 = dòng chung, dòng 2 = tự thêm. Đơn vị B: dòng 0 = DA2, dòng 1 = chung.
const dsGhep = [
  { ma: 'A', anhXa: { 3: 0, 5: 1 }, thua: [2], hang: { 0: ['A', 'DA1', 10, 20], 1: ['A', 'Chung', 1, 2], 2: ['A', 'DA mới', 7, 14] } },
  { ma: 'B', anhXa: { 4: 0, 5: 1 }, thua: [], hang: { 0: ['B', 'DA2', 20, 40], 1: ['B', 'Chung', 2, 4] } }
];

bai('Ghép: dòng mã đơn vị tại chỗ, dòng all mỗi đơn vị một dòng, dòng tự thêm sau dòng cuối của đơn vị', () => {
  const ra = h.keHoachGhep_(mauGhep.cotA, 2, true, dsGhep);
  assert.deepEqual(sach(ra), [
    { mau: 3, dv: 0, i: 0 },
    { mau: 4, dv: 1, i: 0 },
    { mau: 5, dv: 0, i: 1 },
    { mau: 5, dv: 0, i: 2, moi: true },
    { mau: 5, dv: 1, i: 1 },
    { mau: 6, dv: -1 }
  ]);
  const khoi = h.khoiGhep_(ra, mauGhep, dsGhep, [3], [3, 4, 5]);
  assert.deepEqual(sach(khoi.gt), [
    ['A', 'DA1', 10, 0], ['B', 'DA2', 20, 0], ['A', 'Chung', 1, 0], ['A', 'DA mới', 7, 14], ['B', 'Chung', 2, 0], ['', 'Cộng', '', 0]
  ]);
  // dòng mẫu giữ công thức; dòng tự thêm: giá trị đơn vị + công thức dòng mẫu đứng trước; cột A không công thức
  assert.deepEqual(sach(khoi.ct.map((r) => r[3])), ['R1C1x', 'R1C1x', 'R1C1x', 'R1C1x', 'R1C1x', 'R1C1x']);
  assert.equal(khoi.ct[5][2], 'TONG');
});

bai('Ghép: đơn vị không đọc được → dòng mẫu giữ nguyên; ngoài dòng nhập thì không điền', () => {
  const ra = h.keHoachGhep_(mauGhep.cotA, 2, true, [dsGhep[1]]);
  assert.deepEqual(sach(ra.map((r) => r.dv)), [-1, 0, 0, -1]);
  const khoi = h.khoiGhep_(ra, mauGhep, [dsGhep[1]], [3], [3]);   // chỉ dòng 3 là dòng nhập
  assert.deepEqual(sach(khoi.gt[1]), ['B', 'DA2', '', 0]);
});

bai('Ghép, bảng đơn vị tự nhập dòng: nối dòng có chữ của mọi đơn vị theo thứ tự', () => {
  const ds = [
    { ma: 'X', anhXa: {}, thua: [0, 1], hang: { 0: ['X', 'a', 1], 1: ['X', 'b', 2] } },
    { ma: 'Y', anhXa: {}, thua: [], hang: {} },
    { ma: 'Z', anhXa: {}, thua: [0], hang: { 0: ['Z', 'c', 3] } }
  ];
  const ra = h.keHoachGhep_(['Mã đơn vị', '', ''], 1, false, ds);
  assert.deepEqual(sach(ra), [
    { mau: 2, dv: 0, i: 0, moi: true }, { mau: 2, dv: 0, i: 1, moi: true }, { mau: 2, dv: 2, i: 0, moi: true }
  ]);
  const mau = { dongTieuDe: 1, soCot: 3, gt: [['', '', ''], ['', '', '']], ct: [['=ARR', '', ''], ['', '', '']] };
  assert.deepEqual(sach(h.khoiGhep_(ra, mau, ds, [2, 3], [2, 3]).gt), [['X', 'a', 1], ['X', 'b', 2], ['Z', 'c', 3]]);
  // không đơn vị nào có dòng → còn một dòng mẫu trống
  assert.deepEqual(sach(h.keHoachGhep_(['Mã đơn vị', '', ''], 1, false, [ds[1]])), [{ mau: 2, dv: -1 }]);
});

// Mẫu bảng Cộng: tiêu đề dòng 1, dòng 2–4 'all'. Cột B chỉ tiêu, C số (nhập), D ghi chú (nhập).
const mauTong = {
  dongTieuDe: 1, soCot: 4,
  gt: [['all', 'Lúa', '', ''], ['all', 'Ngô', '', ''], ['all', 'Tổng', 0, '']],
  ct: [['', '', '', ''], ['', '', '', ''], ['', '', 'SUM', '']]
};

bai('Cộng: cộng số từng ô theo dòng khớp; ô công thức giữ nguyên; chữ ghép theo đơn vị', () => {
  const ds = [
    { ma: 'P1', anhXa: { 2: 0, 3: 1, 4: 2 }, thua: [], hang: { 0: ['P1', 'Lúa', 1.1, ''], 1: ['P1', 'Ngô', 5, 'mưa'], 2: ['P1', 'Tổng', 6.1, ''] } },
    { ma: 'P2', anhXa: { 2: 0, 3: 1, 4: 2 }, thua: [], hang: { 0: ['P2', 'Lúa', 2.2, ''], 1: ['P2', 'Ngô', '', 'hạn'], 2: ['P2', 'Tổng', 2.2, ''] } },
    { ma: 'P3', anhXa: { 2: 0 }, thua: [], hang: { 0: ['P3', 'Lúa', 'chưa có', 'x'] } }
  ];
  const khoi = h.khoiTong_(mauTong, ds, [3, 4], [2, 3, 4]);
  assert.deepEqual(sach(khoi.gt), [
    ['all', 'Lúa', 3.3, 'P3: x'],
    ['all', 'Ngô', 5, 'P1: mưa\nP2: hạn'],
    ['all', 'Tổng', 0, '']
  ]);
  assert.equal(khoi.boQua, 1);   // 'chưa có' của P3 ở cột số
  assert.equal(khoi.ct[2][2], 'SUM');
});

bai('Cộng: ô ngày ghép thành chữ dd/mm/yyyy; không đơn vị nào → giữ ô mẫu', () => {
  const ds = [{ ma: 'P1', anhXa: { 2: 0 }, thua: [], hang: { 0: ['P1', 'Lúa', '', h.luuGiaTri_(new Date(2026, 9, 5))] } }];
  const khoi = h.khoiTong_(sach(mauTong), sach(ds), [3, 4], [2, 3]);
  assert.equal(khoi.gt[0][3], 'P1: 05/10/2026');
  assert.deepEqual(sach(h.khoiTong_(mauTong, [], [3, 4], [2, 3]).gt), sach(mauTong.gt));
});

bai('Cộng: cột chữ là cột nhập (tên chỉ tiêu) — chữ y như mẫu thì giữ mẫu, chữ đơn vị sửa thì ghép', () => {
  const ds = [
    { ma: 'P1', anhXa: { 2: 0 }, thua: [], hang: { 0: ['P1', 'Lúa', 1, ''] } },
    { ma: 'P2', anhXa: { 2: 0 }, thua: [], hang: { 0: ['P2', ' Lúa ', 2, ''] } },
    { ma: 'P3', anhXa: { 2: 0 }, thua: [], hang: { 0: ['P3', 'Lúa mùa', 3, ''] } }
  ];
  const khoi = h.khoiTong_(mauTong, ds, [2, 3, 4], [2]);
  assert.deepEqual(sach(khoi.gt[0]), ['all', 'P3: Lúa mùa', 6, '']);
  assert.deepEqual(sach(h.khoiTong_(mauTong, ds.slice(0, 2), [2, 3], [2]).gt[0]), ['all', 'Lúa', 3, '']);
});

bai('Cộng, công thức trỏ file đơn vị: cột số thành =N(IMPORTRANGE)+…; cột chữ, ô công thức mẫu giữ nguyên', () => {
  assert.equal(h.congThucLienKet_([{ fileId: 'F1', dong: 2 }, { fileId: 'F2', dong: 4 }], 3, '20.11.2026', ';'),
    '=N(IMPORTRANGE("F1";"\'20.11.2026\'!C2"))+N(IMPORTRANGE("F2";"\'20.11.2026\'!C4"))');
  // P2 có dòng tiêu đề ở dòng 3 (lệch 2 dòng so với P1) → địa chỉ theo tab của chính nó
  const ds = [
    { ma: 'P1', fileId: 'F1', dongTieuDe: 1, anhXa: { 2: 0, 3: 1 }, thua: [], hang: { 0: ['P1', 'Lúa', 1, 'a'], 1: ['P1', 'Ngô', '', ''] } },
    { ma: 'P2', fileId: 'F2', dongTieuDe: 3, anhXa: { 2: 0 }, thua: [], hang: { 0: ['P2', 'Lúa', 2, ''] } }
  ];
  const khoi = h.khoiTong_(mauTong, ds, [2, 3, 4], [2, 3, 4], { tenKy: '20.11.2026', ngan: ';' });
  assert.equal(khoi.gt[0][2], 3);   // giá trị tạm trước khi công thức tính
  assert.equal(khoi.ct[0][2], '=N(IMPORTRANGE("F1";"\'20.11.2026\'!C2"))+N(IMPORTRANGE("F2";"\'20.11.2026\'!C4"))');
  assert.equal(khoi.ct[1][2], '=N(IMPORTRANGE("F1";"\'20.11.2026\'!C3"))');   // Ngô: chỉ P1 có dòng
  assert.equal(khoi.ct[2][2], 'SUM');                                          // ô công thức của mẫu
  assert.equal(khoi.ct[0][1], '');                                             // cột chữ: không công thức
  assert.equal(khoi.ct[0][3], '');
  assert.equal(khoi.gt[0][3], 'P1: a');
  // không cài → như cũ, không công thức
  assert.equal(h.khoiTong_(mauTong, ds, [2, 3, 4], [2, 3, 4]).ct[0][2], '');
  assert.deepEqual([h.chuanGiuTongHop_('congThuc'), h.chuanGiuTongHop_(' giaTri '), h.chuanGiuTongHop_('x')],
    ['congThuc', 'giaTri', 'congThuc']);
});

bai('đếm dòng không khớp: dòng mẫu của đơn vị thiếu ở tab + dòng thừa ở bảng Cộng', () => {
  assert.equal(h.demKhongKhop_(mauGhep.cotA, 2, true, false, [{ ma: 'A', anhXa: { 3: 0 }, thua: [1] }]), 1);   // thiếu dòng all
  assert.equal(h.demKhongKhop_(['Mã đơn vị', 'all'], 1, true, true, [{ ma: 'P', anhXa: { 2: 0 }, thua: [1, 2] }]), 2);
  assert.equal(h.demKhongKhop_(['Mã đơn vị', ''], 1, false, false, [{ ma: 'X', anhXa: {}, thua: [0] }]), 0);
});

bai('bảng Ghép cột: mỗi đơn vị một cụm cột, không cộng; đơn vị chưa đọc được → ô trống; lọc theo Đơn vị chủ trì', () => {
  // mẫu: A Mã · B Chỉ tiêu · C (1) · D (2) · E Đơn vị chủ trì; dữ liệu dòng 3–4
  const mau = { dongTieuDe: 2, soCot: 5, cotKhung: [1, 2, 5],
    hienThi: [['T'], ['Mã đơn vị', 'Chỉ tiêu', '(1)', '(2)', ' đơn vị chủ trì ']],
    gt: [['all', 'Lúa', '', '', 'TT'], ['all', 'Bò', '', '', 'CN']] };
  const dsDv = [
    { ma: 'X1', ten: 'Xã 1', du: { anhXa: { 3: 0, 4: 1 }, hang: { 0: ['X1', 'Lúa', 1, 2, 'TT'], 1: ['X1', 'Bò', 5, 6, 'CN'] } } },
    { ma: 'X2', ten: 'Xã 2', du: null }];
  const b = sach(h.bangTheoDonVi_(mau, dsDv, [3, 4]));
  assert.deepEqual(b.cotNhan, [2, 5]);
  assert.deepEqual(b.dau1, ['Chỉ tiêu', ' đơn vị chủ trì ', 'Xã 1', '', 'Xã 2', '']);
  assert.deepEqual(b.dau2, ['', '', '(1)', '(2)', '(1)', '(2)']);
  assert.deepEqual(b.khoi, [{ tu: 3, so: 2, tp: false }, { tu: 5, so: 2, tp: false }]);
  assert.deepEqual(b.gt, [['Lúa', 'TT', 1, 2, '', ''], ['Bò', 'CN', 5, 6, '', '']]);
  assert.equal(h.cotChuTri_(mau, b.cotNhan), 5);
  assert.equal(h.cotChuTri_(mau, [2]), 0);
  assert.deepEqual(sach(h.locChuTri_(b, 5, 'CN')), [['Bò', 'CN', 5, 6, '', '']]);
  assert.deepEqual(sach(h.locChuTri_(b, 5, 'BVMT')), []);
  assert.deepEqual(sach(h.locChuTri_(b, 9, 'CN')), []);
  // cụm Toàn thành phố đứng trước các đơn vị, ô để trống (công thức ghi sau)
  const t = sach(h.bangTheoDonVi_(mau, dsDv, [3, 4], [3, 4]));
  assert.deepEqual(t.dau1, ['Chỉ tiêu', ' đơn vị chủ trì ', 'Toàn thành phố', '', 'Xã 1', '', 'Xã 2', '']);
  assert.deepEqual(t.khoi, [{ tu: 3, so: 2, tp: true }, { tu: 5, so: 2, tp: false }, { tu: 7, so: 2, tp: false }]);
  assert.deepEqual(t.gt[1], ['Bò', 'CN', '', '', 5, 6, '', '']);
  // cụm TP có cột ngoài cột chia (4) → GAS cộng sẵn; ô công thức ở mẫu → để trống
  const k = sach(h.bangTheoDonVi_(mau, [dsDv[0], { ma: 'X3', ten: 'Xã 3',
    du: { anhXa: { 3: 0, 4: 1 }, hang: { 0: ['X3', 'Lúa', 0.1, 0.2, 'TT'], 1: ['X3', 'Bò', 1, 'x', 'CN'] } } }], [3], [3, 4]));
  assert.deepEqual(k.dau1, ['Chỉ tiêu', ' đơn vị chủ trì ', 'Toàn thành phố', '', 'Xã 1', 'Xã 3']);
  assert.deepEqual(k.gt, [['Lúa', 'TT', '', 2.2, 1, 0.1], ['Bò', 'CN', '', 6, 5, 1]]);
  const kCt = sach(h.bangTheoDonVi_(Object.assign({ ct: [['', '', '', '=1'], []] }, mau), dsDv, [3], [3, 4]));
  assert.deepEqual(kCt.gt[0].slice(2, 4), ['', '']);
});

bai('Toàn thành phố: ô nhập = cộng các cụm đơn vị; công thức mẫu trong cụm giữ, trỏ ra ngoài cụm → trống', () => {
  // mẫu: E (1) nhập · F (2) nhập · G % = F/K (K ngoài cụm); dòng 4 năng suất = R[-1]C*10/R[-2]C (dòng khoá)
  const mau = { dongTieuDe: 2, gt: [['all'], ['all'], ['all']],
    ct: [[], [], ['', '', '', '', '=IFERROR(R[-1]C*10/R[-2]C,"")', '', '=IFERROR(RC[-1]/RC[4]*100,"")']] };
  const ct = sach(h.congThucTp_(mau, [5, 6, 7], [5, 6, 7], [5, 6], [3, 4], 2, ','));
  const cong = '=IF(COUNT(RC[3],RC[6])=0,"",SUM(RC[3],RC[6]))';
  assert.deepEqual(ct[0], [cong, cong, '']);
  assert.deepEqual(ct[2], ['=IFERROR(R[-1]C*10/R[-2]C,"")', '', '']);
  // cụm Toàn thành phố có thêm K (cột 11, nhập, không chia theo xã) → % G = F/K tính được
  assert.deepEqual(sach(h.cotTp_([5, 6, 7], [5, 6, 11])), [5, 6, 7, 11]);
  const ct2 = sach(h.congThucTp_(mau, [5, 6, 7], [5, 6, 7, 11], [5, 6, 11], [3, 4], 2, ','));
  // cụm TP rộng 4, cụm xã rộng 3: E(TP) → E xã 1 cách 4, xã 2 cách 7; F(TP) → F xã 1 cách 4
  assert.deepEqual(ct2[0], ['=IF(COUNT(RC[4],RC[7])=0,"",SUM(RC[4],RC[7]))', '=IF(COUNT(RC[4],RC[7])=0,"",SUM(RC[4],RC[7]))', '', '']);
  assert.deepEqual(ct2[2], ['=IFERROR(R[-1]C*10/R[-2]C,"")', '', '', ''], 'G không phải công thức % ở dòng này');
  // như bcxa_kq_thang: chia theo xã E:J, nhập E:G + K:M → cụm TP E:M; H = F/K giữ được
  const pct = '=IFERROR(RC[-2]/RC[3]*100,"")';
  const mau3 = { dongTieuDe: 2, gt: [['all']], ct: [['', '', '', '', '', '', '', pct]] };
  const tp = h.cotTp_([5, 6, 7, 8, 9, 10], [5, 6, 7, 11, 12, 13]);
  assert.deepEqual(sach(tp), [5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const ct3 = sach(h.congThucTp_(mau3, [5, 6, 7, 8, 9, 10], tp, [5, 6, 7, 11, 12, 13], [3], 2, ','))[0];
  assert.equal(ct3[0], '=IF(COUNT(RC[9],RC[15])=0,"",SUM(RC[9],RC[15]))', 'E: cụm TP rộng 9, cụm xã rộng 6');
  assert.equal(ct3[3], pct);
  assert.deepEqual(ct3.slice(6), ['', '', ''], 'K:M: giá trị cộng sẵn, không công thức');
  assert.equal(h.dichCongThucTp_('=RC[1]+R[2]C[-1]', 6, [5, 6, 7]), '=RC[1]+R[2]C[-1]');
  assert.equal(h.dichCongThucTp_('=RC[1]', 6, [5, 6, 8]), '', 'cột 7 không có trong cụm');
  assert.equal(h.dichCongThucTp_('=R3C5', 5, [5, 6]), '', 'tham chiếu tuyệt đối');
  assert.equal(h.dichCongThucTp_('=IFERROR(SUM(RC),"")', 5, [5]), '=IFERROR(SUM(RC),"")');
  assert.deepEqual(sach(h.congThucTp_(mau, [5], [5], [5], [3], 0, ','))[0], ['']);
});

bai('cột toàn chữ (đặt kiểu chữ trước khi ghi — "1.1.1" không thành ngày); cột có số / ngày giữ nguyên', () => {
  const gt = [['all', '1.1.1', 5, { d: 0 }], ['all', '', 6, '']];
  assert.deepEqual(sach(h.cotToanChu_(gt, [1, 2, 3, 4])), [1, 2]);
  assert.deepEqual(sach(h.cotToanChu_([], [1])), []);
});

console.log('kiem-gas-tong-hop: ' + soBai + ' bài ĐẠT');
