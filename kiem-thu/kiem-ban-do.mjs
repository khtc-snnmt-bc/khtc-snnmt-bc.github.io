// ============================================================
// bcsnn · app/kiem-thu/kiem-ban-do.mjs
// Vai trò  : Kiểm domains bản đồ (ban-do.js): kiểu vẽ, bộ lọc loại, khung thông tin
// Chạy     : node app/kiem-thu/kiem-ban-do.mjs
// Phiên bản: 0.3.0 · Cập nhật: 11/10/2026 22:31
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sandbox = { atob };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../js/domains/ban-do.js', import.meta.url), 'utf8'), sandbox);
vm.runInContext('this.BD = BAN_DO;', sandbox);
const { BD } = sandbox;
const sach = (x) => JSON.parse(JSON.stringify(x));

let soBai = 0;
function bai(ten, fn) { fn(); soBai++; }

const khoanh = {
  id: 'khoanh_dat', ten: 'Khoanh đất', hinh: 'vung',
  loai: [{ ma: 'LUC', ten: 'Đất chuyên trồng lúa', mau: '#FFFC82' }, { ma: 'CLN', ten: 'Đất trồng cây lâu năm', mau: '#FFD7AA' }],
};
const duong = { id: 'kenh', ten: 'Kênh', hinh: 'duong', loai: [{ ma: '', ten: 'Kênh', mau: '#0077cc' }] };

bai('lopVe vùng: nền màu theo loại + viền + lớp chọn', () => {
  const ls = sach(BD.lopVe(khoanh, 'ck'));
  assert.deepEqual(ls.map((l) => l.id), ['khoanh_dat-nen', 'khoanh_dat-vien', 'khoanh_dat-chon']);
  assert.equal(ls[0].source, 'ck-khoanh_dat', 'mỗi nhóm một file trên kho');
  assert.equal(ls[0]['source-layer'], 'khoanh_dat');
  assert.deepEqual(ls[0].paint['fill-color'], ['match', ['get', 'loai'], 'LUC', '#FFFC82', 'CLN', '#FFD7AA', '#888888']);
  assert.deepEqual(ls[2].filter, ['==', ['id'], -1]);
});

bai('lopVe vùng chỉ viền: nền trong suốt, viền theo màu nhóm', () => {
  const ranh = { id: 'ranh_xa', ten: 'Ranh xã', hinh: 'vung', vien: true, loai: [{ ma: '', ten: 'Ranh xã', mau: '#7B2D8E' }] };
  const ls = sach(BD.lopVe(ranh, 'ck'));
  assert.deepEqual(ls.map((l) => l.id), ['ranh_xa-nen', 'ranh_xa-vien', 'ranh_xa-chon', 'ranh_xa-chu']);
  assert.equal(ls[0].paint['fill-opacity'], 0);
  assert.equal(ls[1].paint['line-color'], '#7B2D8E');
  // nhãn tên xã: lớp điểm riêng, ô bản đồ không lặp tên
  assert.equal(ls[3].type, 'symbol');
  assert.equal(ls[3]['source-layer'], 'ranh_xa_nhan');
  assert.deepEqual(ls[3].layout['text-field'], ['get', 'ten']);
});

bai('lopVe nhóm Nội bộ: id lớp có tiền tố nguồn, source-layer giữ tên nhóm', () => {
  const ls = sach(BD.lopVe(khoanh, 'nb'));
  assert.deepEqual(ls.map((l) => l.id), ['nb:khoanh_dat-nen', 'nb:khoanh_dat-vien', 'nb:khoanh_dat-chon']);
  assert.equal(ls[0].source, 'nb-khoanh_dat');
  assert.equal(ls[0]['source-layer'], 'khoanh_dat');
  assert.equal(BD.maLop(khoanh, 'ck', 'chon'), 'khoanh_dat-chon');
  assert.equal(BD.maNguon(khoanh, 'nb'), 'nb-khoanh_dat');
});

bai('hanVe: đọc exp của vé Google; vé hỏng = 0', () => {
  const nd = Buffer.from(JSON.stringify({ email: 'ả@gmail.com', exp: 1760000000 })).toString('base64url');
  assert.equal(BD.hanVe('eyJhbGciOiJSUzI1NiJ9.' + nd + '.chuky'), 1760000000);
  for (const cat of ['', 'a', 'a.b', 'a.!!!.c']) assert.equal(BD.hanVe(cat), 0);
  // đủ mọi độ dài phần nội dung (đệm base64)
  for (let i = 0; i < 4; i++) {
    const p = Buffer.from(JSON.stringify({ exp: 5, x: 'y'.repeat(i) })).toString('base64url');
    assert.equal(BD.hanVe('h.' + p + '.k'), 5);
  }
});

bai('lopVe đường một màu', () => {
  const ls = sach(BD.lopVe(duong, 'ck'));
  assert.equal(ls[0].paint['line-color'], '#0077cc');
  assert.equal(ls[0].type, 'line');
});

bai('boLoc: chỉ loại đang bật; nhóm không chia loại thì không lọc', () => {
  assert.deepEqual(sach(BD.boLoc(khoanh, ['LUC'])), ['in', ['get', 'loai'], ['literal', ['LUC']]]);
  assert.deepEqual(sach(BD.boLoc(khoanh, [])), ['in', ['get', 'loai'], ['literal', []]]);
  assert.equal(BD.boLoc(duong, []), null);
});

bai('thongTin: tên loại, diện tích, ẩn cột _ và mvt_id, nội dung loại đất', () => {
  const ld = { LUC: { ten: 'x', dacDiem: 'Đất phù sa', thucTrang: '', dinhHuong: 'Giữ lúa' } };
  const tt = sach(BD.thongTin(khoanh, { mvt_id: 5, loai: 'LUC', dien_tich_m2: 25340.6, _ma: 'a', ghi_chu: 'Ô 3' }, ld));
  assert.equal(tt.tieuDe, 'Đất chuyên trồng lúa');
  assert.deepEqual(tt.dong, [
    { nhan: 'Mã loại', giaTri: 'LUC' },
    { nhan: 'Diện tích', giaTri: '2,53 ha' },
    { nhan: 'ghi_chu', giaTri: 'Ô 3' },
  ]);
  assert.deepEqual(tt.noiDung, [{ nhan: 'Đặc điểm', giaTri: 'Đất phù sa' }, { nhan: 'Định hướng', giaTri: 'Giữ lúa' }]);
});

bai('maThuyetMinh: neo _bang + _id theo quyền lớp; thiếu / lạ thì null', () => {
  assert.equal(BD.maThuyetMinh('nb', { _bang: 'csnuoiyen', _id: '5' }), 'nb-tm/csnuoiyen/5');
  assert.equal(BD.maThuyetMinh('ck', { _bang: 'cln', _id: 0 }), 'ck-tm/cln/0');
  assert.equal(BD.maThuyetMinh('ck', { _bang: 'cln' }), null);
  assert.equal(BD.maThuyetMinh('ck', { _id: '5' }), null);
  assert.equal(BD.maThuyetMinh('ck', { _bang: 'cln', _id: '../5' }), null);
  assert.equal(BD.maThuyetMinh('ck', null), null);
});

bai('dinhDangDienTich: dưới 1 ha ghi m²', () => {
  assert.equal(BD.dinhDangDienTich(658.7), '659 m²');
  assert.equal(BD.dinhDangDienTich(10000), '1 ha');
});

bai('khungKeo: nới nửa màn hình ở mức phóng nhỏ nhất', () => {
  // zoom 8: 512·256 = 131072 điểm ảnh cho 360° → nửa màn 1024 điểm ảnh rộng = 512 điểm ảnh ≈ 1,40625°
  const k = sach(BD.khungKeo([106, 10, 107, 11], 1024, 0, 8));
  assert.ok(Math.abs(k[0][0] - (106 - 1.40625)) < 1e-9 && Math.abs(k[1][0] - (107 + 1.40625)) < 1e-9);
  assert.ok(Math.abs(k[0][1] - 10) < 1e-9 && Math.abs(k[1][1] - 11) < 1e-9);   // cao 0 → không nới vĩ độ
  const c = sach(BD.khungKeo([106, 10, 107, 11], 0, 600, 8));
  assert.ok(c[0][1] < 10 - 0.8 && c[1][1] > 11 + 0.8 && c[0][1] > 10 - 0.9);   // ~0,82° ở vĩ độ ~10
});

bai('taoKml: khung, tên ảnh, thoát ký tự', () => {
  const kml = BD.taoKml({ w: 106.5, s: 10.9, e: 106.6, n: 11 }, 'anh.png', 'Khoanh <đất> & đơn vị');
  assert.match(kml, /<north>11<\/north><south>10.9<\/south><east>106.6<\/east><west>106.5<\/west>/);
  assert.match(kml, /<href>anh.png<\/href>/);
  assert.match(kml, /<name>Khoanh &lt;đất&gt; &amp; đơn vị<\/name>/);
});

bai('taoZip: cấu trúc zip không nén, CRC đúng', () => {
  const nd = Buffer.from('123456789'), nd2 = Buffer.from('xyz');
  const z = Buffer.from(BD.taoZip([{ ten: 'doc.kml', byte: new Uint8Array(nd) }, { ten: 'anh.png', byte: new Uint8Array(nd2) }]));
  assert.equal(z.readUInt32LE(0), 0x04034b50);
  assert.equal(z.readUInt32LE(14), 0xCBF43926);            // CRC32 chuẩn của "123456789"
  const cuoi = z.length - 22;
  assert.equal(z.readUInt32LE(cuoi), 0x06054b50);
  assert.equal(z.readUInt16LE(cuoi + 10), 2);              // số tệp
  const viTriTrungTam = z.readUInt32LE(cuoi + 16);
  assert.equal(z.readUInt32LE(viTriTrungTam), 0x02014b50);
  assert.equal(z.readUInt32LE(viTriTrungTam + 42), 0);     // tệp đầu bắt đầu ở 0
  assert.equal(z.subarray(30, 37).toString(), 'doc.kml');
});

bai('duongDanEarthWeb: tâm khung, khoảng cách theo bề ngang', () => {
  const u = BD.duongDanEarthWeb({ w: 106.5, s: 10.9, e: 106.7, n: 11.0 });
  const m = /^https:\/\/earth\.google\.com\/web\/@10\.950000,106\.600000,0a,(\d+)d,35y,0h,0t,0r$/.exec(u);
  assert.ok(m, u);
  // bề ngang 0,2° ở vĩ độ 10,95 ≈ 21,86 km → khoảng cách ≈ 34,7 km
  assert.ok(Math.abs(+m[1] - 34660) < 300, m[1]);
});

console.log(`kiem-ban-do: ${soBai} bài đạt`);
