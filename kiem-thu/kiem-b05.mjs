// ============================================================
// bcsnn · app/kiem-thu/kiem-b05.mjs
// Vai trò  : Kiểm thử các hàm thuần của b05 bằng Node.js
// Chạy     : node app/kiem-thu/kiem-b05.mjs
// Phiên bản: 0.1.0 · Cập nhật: 05/10/2026 12:45
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
  'js/domains/phien-dang-nhap.js'
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

// 3. Kiểm sinh URL Sheet & Đăng nhập Google
bai('Sinh URL Google Sheet và AccountChooser', () => {
  const url1 = sandbox.KY_BAO_CAO.taoUrlSheet('file123', 'user@gmail.com');
  assert.equal(url1, 'https://docs.google.com/spreadsheets/d/file123/edit?authuser=user%40gmail.com');

  const urlKhongEmail = sandbox.KY_BAO_CAO.taoUrlSheet('file123');
  assert.equal(urlKhongEmail, 'https://docs.google.com/spreadsheets/d/file123/edit');

  const urlDN = sandbox.KY_BAO_CAO.taoUrlDangNhapGoogle('user@gmail.com');
  assert.equal(urlDN, 'https://accounts.google.com/AccountChooser?Email=user%40gmail.com');
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

console.log('kiem-b05: ' + soBai + ' bài ĐẠT!');
