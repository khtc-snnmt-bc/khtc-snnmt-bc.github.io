// ============================================================
// bcsnn · app/kiem-thu/kiem-b05.mjs
// Vai trò  : Kiểm thử các hàm thuần của b05 bằng Node.js
// Chạy     : node app/kiem-thu/kiem-b05.mjs
// Phiên bản: 0.4.0 · Cập nhật: 10/10/2026 16:10
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function taoMoiTruong(danhSachFile) {
  const sandbox = {
    console: console,
    sessionStorage: (function () {
      let store = {};
      return {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { store = {}; }
      };
    })(),
    location: { hash: '', pathname: '/' }
  };
  vm.createContext(sandbox);

  danhSachFile.forEach((relPath) => {
    const ma = readFileSync(new URL('../' + relPath, import.meta.url), 'utf8');
    vm.runInContext(ma, sandbox);
  });

  return sandbox;
}

const sandbox = taoMoiTruong([
  'js/config/cau-hinh.js',
  'js/utils/bo-dau.js',
  'js/domains/don-vi.js',
  'js/domains/ky-bao-cao.js',
  'js/domains/phien-dang-nhap.js',
  'js/domains/linh-vuc.js'
]);

let soBai = 0;
function bai(ten, fn) {
  fn();
  soBai++;
}

// 1. Kiểm tiện ích bỏ dấu
bai('Bỏ dấu tiếng Việt và so khớp', () => {
  assert.equal(sandbox.BO_DAU.boDau('Ban Quản Lý Dự Án'), 'ban quan ly du an');
  assert.equal(sandbox.BO_DAU.boDau('Đồng Khởi & Nguyễn Huệ'), 'dong khoi & nguyen hue');
  assert.equal(sandbox.BO_DAU.khop('Ban QLDA ĐTXD phường Bình Thới', 'binh thoi'), true);
  assert.equal(sandbox.BO_DAU.khop('Ban QLDA ĐTXD phường Bình Thới', 'BÌNH THỚI'), true);
  assert.equal(sandbox.BO_DAU.khop('Ban QLDA ĐTXD phường Bình Thới', 'quan 1'), false);
});

// 2. Kiểm lọc và sắp xếp đơn vị
bai('Lọc và sắp xếp đơn vị', () => {
  const ds = [
    { unitCode: 'BQLDA.VườnLài', unitName: 'Ban QLDA phường Vườn Lài' },
    { unitCode: 'BQLDA.BinhThoi', unitName: 'Ban QLDA phường Bình Thới' },
    { unitCode: 'BQLDA.AnPhu', unitName: 'Ban QLDA phường An Phú' }
  ];

  const ketQuaLoc = sandbox.DON_VI.locDonVi(ds, 'binh thoi');
  assert.equal(ketQuaLoc.length, 1);
  assert.equal(ketQuaLoc[0].unitCode, 'BQLDA.BinhThoi');

  const ketQuaLocRong = sandbox.DON_VI.locDonVi(ds, '');
  assert.equal(ketQuaLocRong.length, 3);

  const ketQuaSapXep = sandbox.DON_VI.sapXepDonVi(ds);
  assert.equal(ketQuaSapXep[0].unitName, 'Ban QLDA phường An Phú');
  assert.equal(ketQuaSapXep[1].unitName, 'Ban QLDA phường Bình Thới');
  assert.equal(ketQuaSapXep[2].unitName, 'Ban QLDA phường Vườn Lài');
});

// 3. Kiểm sinh URL Sheet
bai('Sinh URL Google Sheet', () => {
  const url1 = sandbox.KY_BAO_CAO.taoUrlSheet('file123', 'user@gmail.com');
  assert.equal(url1, 'https://docs.google.com/spreadsheets/d/file123/edit?authuser=user%40gmail.com');

  const urlKhongEmail = sandbox.KY_BAO_CAO.taoUrlSheet('file123');
  assert.equal(urlKhongEmail, 'https://docs.google.com/spreadsheets/d/file123/edit');
});

// 4. Kiểm quản lý phiên đăng nhập
bai('Lưu, đọc, xoá phiên đăng nhập', () => {
  const sach = (x) => (x ? JSON.parse(JSON.stringify(x)) : x);
  assert.equal(sandbox.PHIEN.doc(), null);

  const phienMoi = { email: 'test@gmail.com', unitCode: 'BQLDA.BinhThoi', tables: [] };
  sandbox.PHIEN.luu(phienMoi);

  const daDoc = sandbox.PHIEN.doc();
  assert.deepEqual(sach(daDoc), sach(phienMoi));

  sandbox.PHIEN.xoa();
  assert.equal(sandbox.PHIEN.doc(), null);
});

bai('Tìm đơn vị khớp chính xác tên/mã, không khớp một phần', () => {
  const ds = [
    { unitCode: 'KHTC.SNNMT', unitName: 'Phòng Kế hoạch - Tài chính Sở', role: 'Quản trị' },
    { unitCode: 'BQLDA.BinhThoi', unitName: 'Ban QLDA ĐTXD phường Bình Thới', role: 'Đơn vị báo cáo' }
  ];
  const D = sandbox.DON_VI;
  assert.equal(D.timChinhXac(ds, ' ban qlda dtxd phuong binh thoi ').unitCode, 'BQLDA.BinhThoi');
  assert.equal(D.timChinhXac(ds, 'khtc.snnmt').unitCode, 'KHTC.SNNMT');
  assert.equal(D.timChinhXac(ds, 'Ban QLDA'), null);
  assert.equal(D.timChinhXac(ds, ''), null);
});

bai('Cột chọn nhanh: hai nhóm cố định, trong nhóm gần đây lên đầu rồi abc', () => {
  const sach = (x) => JSON.parse(JSON.stringify(x));
  const ds = [
    { unitCode: 'Q1', unitName: 'Q1', role: 'Quản trị' },
    { unitCode: 'Q2', unitName: 'Q2', role: 'Quản lý báo cáo' },
    { unitCode: 'A', unitName: 'A', role: 'Đơn vị báo cáo' },
    { unitCode: 'B', unitName: 'B', role: 'Đơn vị báo cáo' },
    { unitCode: 'C', unitName: 'C', role: 'Đơn vị báo cáo' },
    { unitCode: 'D', unitName: 'D', role: 'Đơn vị báo cáo' }
  ];
  const nhom = sach(sandbox.DON_VI.nhomChonNhanh(ds, ['C', 'KHONG_CO', 'Q2']));
  assert.deepEqual(nhom.map((n) => n.ten), ['Quản trị', 'Đơn vị báo cáo']);
  assert.deepEqual(nhom[0].ds.map((d) => d.unitCode), ['Q2', 'Q1']);
  assert.deepEqual(nhom[1].ds.map((d) => d.unitCode), ['C', 'A', 'B', 'D']);
  const khongGanDay = sach(sandbox.DON_VI.nhomChonNhanh(ds, []));
  assert.deepEqual(khongGanDay[1].ds.map((d) => d.unitCode), ['A', 'B', 'C', 'D']);
  assert.equal(sandbox.DON_VI.nhomChonNhanh([ds[2]], []).length, 1); // bỏ nhóm rỗng
});

bai('Ghi đơn vị gần đây: mới nhất lên đầu, bỏ trùng, tối đa 2', () => {
  const P = { themGanDay: (d, m) => JSON.parse(JSON.stringify(sandbox.PHIEN.themGanDay(d, m))) };
  assert.deepEqual(P.themGanDay([], 'A'), ['A']);
  assert.deepEqual(P.themGanDay(['A'], 'B'), ['B', 'A']);
  assert.deepEqual(P.themGanDay(['B', 'A'], 'A'), ['A', 'B']);
  assert.deepEqual(P.themGanDay(['B', 'A'], 'C'), ['C', 'B']);
});

bai('b06a: vai trò Quản trị và hạn phiên quản trị', () => {
  const P = sandbox.PHIEN;
  assert.equal(P.laQuanTri({ role: 'Quản trị' }), true);
  assert.equal(P.laQuanTri({ role: 'Quản lý báo cáo' }), false);
  assert.equal(P.laQuanTri(null), false);
  assert.equal(P.conHanQuanTri({ token: 't', hetHan: 2000 }, 1000), true);
  assert.equal(P.conHanQuanTri({ token: 't', hetHan: 1000 }, 1000), false);
  assert.equal(P.conHanQuanTri({ hetHan: 2000 }, 1000), false);
  P.luuQuanTri('t', 60, 1000);
  assert.equal(P.docQuanTri().hetHan, 61000);
  P.xoaQuanTri();
  assert.equal(P.docQuanTri(), null);
});

bai('b10: lĩnh vực theo thư mục web', () => {
  const L = sandbox.LINH_VUC;
  assert.equal(L.layTheoThuMuc('Nhiem_Vu').ma, 'NHIEMVU');
  assert.equal(L.layTheoThuMuc('BTTDC').thuMuc, 'BTTDC');
  assert.equal(L.layTheoThuMuc('khong_co'), null);
  assert.equal(L.layTheoThuMuc(''), null);
});

bai('b10b: phiên + phiên quản trị riêng từng lĩnh vực', () => {
  const P = sandbox.PHIEN;
  assert.equal(P.khoaTheoLinhVuc('bcsnn_phien', 'BC_xa'), 'bcsnn_phien_BC_xa');
  assert.equal(P.khoaTheoLinhVuc('bcsnn_phien', ''), 'bcsnn_phien');
  P.luuLinhVuc('BTTDC');
  P.luu({ unitCode: 'A', email: 'a@x.vn' });
  P.luuQuanTri('t1', 60, 0);
  P.luuLinhVuc('Nhiem_Vu');
  assert.equal(P.doc(), null);                     // lĩnh vực khác: chưa đăng nhập
  assert.equal(P.docQuanTri(), null);
  P.luu({ unitCode: 'B', email: 'a@x.vn' });
  P.luuLinhVuc('BTTDC');
  assert.equal(P.doc().unitCode, 'A');             // quay lại: phiên cũ còn nguyên
  assert.equal(P.docQuanTri().token, 't1');
  P.xoa();
  assert.equal(P.doc(), null);
  P.luuLinhVuc('Nhiem_Vu');
  assert.equal(P.doc().unitCode, 'B');             // đăng xuất BTTDC không đụng Nhiệm vụ
  assert.equal(P.docLinhVuc(), 'Nhiem_Vu');
});

console.log('kiem-b05: ' + soBai + ' bài ĐẠT!');
