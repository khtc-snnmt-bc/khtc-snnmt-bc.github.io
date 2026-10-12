// ============================================================
// bcsnn · js/domains/ban-do.js
// Vai trò  : Nghiệp vụ thuần của bản đồ: dựng kiểu vẽ MapLibre cho từng nhóm lớp, bộ lọc theo loại
//            đang bật, các dòng hiện ở khung thông tin khi bấm đối tượng, đóng gói KMZ (KML + ảnh) cho Google Earth
// Lớp      : domains — được gọi bởi: pages · được phép gọi: config (không chạm DOM, không gọi services)
// Phiên bản: 0.5.0 · Cập nhật: 12/10/2026 23:20
// ============================================================
// Nhóm lớp (sinh từ danh-sach-lop.xlsx): { id, ten, hinh: 'vung'|'duong'|'diem', vien?: true, loai: [{ma, ten, mau}] }
// vien = vùng chỉ vẽ viền (ranh giới).
// Mỗi nhóm một file PMTiles (ck-<id> / nb-<id>), trong đó lớp tên = id; đối tượng có cột `loai` = mã loại.

var BAN_DO = (function () {
  'use strict';

  var TEN_COT = { loai: 'Loại', dien_tich_m2: 'Diện tích' };
  var COT_AN = { mvt_id: true };
  var PHONG_CHU = 'NotoSansRegular';  // thư mục phông ở app/vendor/noto-sans/

  /** Biểu thức màu: theo mã loại, loại lạ thì xám */
  function bieuThucMau(nhom) {
    if (nhom.loai.length <= 1) return nhom.loai.length ? nhom.loai[0].mau : '#888888';
    var bt = ['match', ['get', 'loai']];
    nhom.loai.forEach(function (l) { bt.push(l.ma, l.mau); });
    bt.push('#888888');
    return bt;
  }

  /** Bộ lọc chỉ hiện các loại đang bật (danh sách mã); nhóm không chia loại thì không lọc */
  function boLoc(nhom, maBat) {
    if (nhom.loai.length <= 1 || !nhom.loai[0].ma) return null;
    return ['in', ['get', 'loai'], ['literal', maBat.slice()]];
  }

  /** Nguồn (= tên file trên kho, không phiên bản) của một nhóm: 'ck-<id>' | 'nb-<id>' */
  function maNguon(nhom, quyen) {
    return quyen + '-' + nhom.id;
  }

  /** Id lớp vẽ: <id nhóm>-<phần>; nhóm Nội bộ thêm tiền tố (cùng tên nhóm có thể có cả Công khai và Nội bộ) */
  function maLop(nhom, quyen, phan) {
    return (quyen === 'ck' ? '' : quyen + ':') + nhom.id + '-' + phan;
  }

  /** Các lớp vẽ MapLibre của một nhóm; quyen: 'ck' | 'nb' */
  function lopVe(nhom, quyen) {
    var mau = bieuThucMau(nhom);
    var chung = { source: maNguon(nhom, quyen), 'source-layer': nhom.id };
    function lop(phan, kieu, paint, them) {
      var l = Object.assign({ id: maLop(nhom, quyen, phan), type: kieu, paint: paint }, chung, them || {});
      return l;
    }
    if (nhom.hinh === 'vung' && nhom.vien) {
      // Ranh giới: nền trong suốt (vẫn bấm được), chỉ vẽ viền — không che lớp bên dưới
      return [
        lop('nen', 'fill', { 'fill-color': mau, 'fill-opacity': 0 }),
        lop('vien', 'line', {
          'line-color': mau,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 13, 1.6, 17, 2.5],
        }),
        lop('chon', 'line', { 'line-color': '#d62828', 'line-width': 3 }, { filter: ['==', ['id'], -1] }),
        // Tên xã: lớp điểm <id nhóm>_nhan (mỗi vùng một điểm, do day-ban-do.py sinh), hiện khi phóng đủ gần;
        // đè lên nhau thì MapLibre tự bớt
        lop('chu', 'symbol', { 'text-color': '#3b1a45', 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.6 }, {
          'source-layer': nhom.id + '_nhan',
          minzoom: 10.5,
          layout: {
            'text-field': ['get', 'ten'],
            'text-font': [PHONG_CHU],
            'text-size': ['interpolate', ['linear'], ['zoom'], 10.5, 10, 14, 14, 17, 17],
            'text-max-width': 7,
          },
        }),
      ];
    }
    if (nhom.hinh === 'vung') {
      return [
        lop('nen', 'fill', { 'fill-color': mau, 'fill-opacity': 0.8 }),
        lop('vien', 'line', {
          'line-color': '#6b6b4a',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0, 13, 0.4, 17, 1.2],
          'line-opacity': 0.6,
        }),
        lop('chon', 'line', { 'line-color': '#d62828', 'line-width': 2.5 }, { filter: ['==', ['id'], -1] }),
      ];
    }
    if (nhom.hinh === 'duong') {
      return [
        lop('duong', 'line', { 'line-color': mau, 'line-width': 1.5 }),
        lop('chon', 'line', { 'line-color': '#d62828', 'line-width': 3 }, { filter: ['==', ['id'], -1] }),
      ];
    }
    return [
      lop('diem', 'circle', { 'circle-color': mau, 'circle-radius': 4, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 }),
      lop('chon', 'circle', { 'circle-color': 'rgba(0,0,0,0)', 'circle-radius': 7, 'circle-stroke-color': '#d62828', 'circle-stroke-width': 2.5 },
        { filter: ['==', ['id'], -1] }),
    ];
  }

  /** Bộ lọc tô viền đối tượng đang chọn (id < 0 = bỏ chọn) */
  function locChon(id) {
    return ['==', ['id'], id == null ? -1 : id];
  }

  function dinhDangSo(so, soLe) {
    return Number(so).toLocaleString('vi-VN', { maximumFractionDigits: soLe, minimumFractionDigits: 0 });
  }

  function dinhDangDienTich(m2) {
    return m2 >= 10000 ? dinhDangSo(m2 / 10000, 2) + ' ha' : dinhDangSo(m2, 0) + ' m²';
  }

  /**
   * Dòng hiện ở khung thông tin.
   * @return {tieuDe, dong: [{nhan, giaTri}], noiDung: [{nhan, giaTri}]}
   */
  function thongTin(nhom, thuocTinh, loaiDat) {
    var loai = nhom.loai.filter(function (l) { return l.ma === thuocTinh.loai; })[0];
    var tieuDe = loai ? loai.ten : nhom.ten;
    var dong = [];
    Object.keys(thuocTinh).forEach(function (cot) {
      var gt = thuocTinh[cot];
      if (cot.charAt(0) === '_' || COT_AN[cot] || gt === '' || gt == null) return;
      if (cot === 'loai') { if (loai && nhom.loai.length > 1) dong.push({ nhan: 'Mã loại', giaTri: loai.ma }); return; }
      if (cot === 'dien_tich_m2') { dong.push({ nhan: TEN_COT[cot], giaTri: dinhDangDienTich(gt) }); return; }
      dong.push({ nhan: TEN_COT[cot] || cot, giaTri: typeof gt === 'number' ? dinhDangSo(gt, 2) : String(gt) });
    });
    var ld = (loaiDat || {})[thuocTinh.loai] || {};
    var noiDung = [['Đặc điểm', ld.dacDiem], ['Thực trạng', ld.thucTrang], ['Định hướng', ld.dinhHuong]]
      .filter(function (x) { return x[1]; })
      .map(function (x) { return { nhan: x[0], giaTri: x[1] }; });
    return { tieuDe: tieuDe, dong: dong, noiDung: noiDung };
  }

  /** Hạn dùng (giây, giờ Unix) của vé Google ID token; vé hỏng thì 0. Chỉ đọc, không kiểm chữ ký (Worker kiểm). */
  function hanVe(ve) {
    try {
      var p = String(ve).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return Number(JSON.parse(atob(p + '==='.slice((p.length + 3) % 4))).exp) || 0;
    } catch (e) {
      return 0;
    }
  }

  /** Khung thành phố [tây, nam, đông, bắc] nới thêm một phần để kéo bản đồ không bị cứng */
  function khungNoi(khung, tiLe) {
    var dx = (khung[2] - khung[0]) * tiLe, dy = (khung[3] - khung[1]) * tiLe;
    return [[khung[0] - dx, khung[1] - dy], [khung[2] + dx, khung[3] + dy]];
  }

  // ---------- Xuất khung đang xem sang Google Earth (KMZ = zip chứa doc.kml + ảnh PNG) ----------

  function xml(chu) {
    return String(chu).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** KML phủ ảnh lên khung {w, s, e, n} (độ). Ảnh chụp Mercator nên chỉ chính xác khi khung nhỏ (cấp xã). */
  function taoKml(khung, tenAnh, ten) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<kml xmlns="http://www.opengis.net/kml/2.2"><GroundOverlay>'
      + '<name>' + xml(ten) + '</name><drawOrder>1</drawOrder>'
      + '<Icon><href>' + xml(tenAnh) + '</href></Icon>'
      + '<LatLonBox><north>' + khung.n + '</north><south>' + khung.s + '</south><east>' + khung.e
      + '</east><west>' + khung.w + '</west><rotation>0</rotation></LatLonBox>'
      + '</GroundOverlay></kml>';
  }

  /** Đường dẫn Google Earth web nhìn đúng khung {w, s, e, n}: tâm khung, khoảng cách camera theo bề ngang
   *  (góc nhìn 35°: khoảng cách ≈ bề ngang / (2·tan 17,5°)) */
  function duongDanEarthWeb(khung) {
    var lat = (khung.s + khung.n) / 2, lon = (khung.w + khung.e) / 2;
    var ngangM = (khung.e - khung.w) * 111320 * Math.cos(lat * Math.PI / 180);
    var d = Math.round(ngangM / (2 * Math.tan(17.5 * Math.PI / 180)));
    return 'https://earth.google.com/web/@' + lat.toFixed(6) + ',' + lon.toFixed(6) + ',0a,' + d + 'd,35y,0h,0t,0r';
  }

  var BANG_CRC = (function () {
    var b = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      b.push(c >>> 0);
    }
    return b;
  })();

  function crc32(byte) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < byte.length; i++) c = BANG_CRC[(c ^ byte[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /** Zip không nén. tep: [{ten: 'chữ ASCII', byte: Uint8Array}] → Uint8Array */
  function taoZip(tep) {
    var phan = [], trungTam = [], vitri = 0;
    function so(n, doDai) {
      var o = [];
      for (var i = 0; i < doDai; i++) o.push((n >>> (8 * i)) & 0xFF);
      return o;
    }
    function chuoi(s) {
      var o = [];
      for (var i = 0; i < s.length; i++) o.push(s.charCodeAt(i) & 0xFF);
      return o;
    }
    tep.forEach(function (t) {
      var crc = crc32(t.byte), ten = chuoi(t.ten);
      var dau = [].concat(so(0x04034b50, 4), so(20, 2), so(0, 2), so(0, 2), so(0, 2), so(0x21, 2),
        so(crc, 4), so(t.byte.length, 4), so(t.byte.length, 4), so(ten.length, 2), so(0, 2), ten);
      trungTam.push([].concat(so(0x02014b50, 4), so(20, 2), so(20, 2), so(0, 2), so(0, 2), so(0, 2), so(0x21, 2),
        so(crc, 4), so(t.byte.length, 4), so(t.byte.length, 4), so(ten.length, 2), so(0, 2), so(0, 2),
        so(0, 2), so(0, 2), so(0, 4), so(vitri, 4), ten));
      phan.push(dau, t.byte);
      vitri += dau.length + t.byte.length;
    });
    var cd = [].concat.apply([], trungTam);
    var cuoi = [].concat(so(0x06054b50, 4), so(0, 2), so(0, 2), so(tep.length, 2), so(tep.length, 2),
      so(cd.length, 4), so(vitri, 4), so(0, 2));
    var tong = vitri + cd.length + cuoi.length, ra = new Uint8Array(tong), p = 0;
    phan.concat([cd, cuoi]).forEach(function (m) { ra.set(m, p); p += m.length; });
    return ra;
  }

  return {
    maNguon: maNguon, maLop: maLop, lopVe: lopVe, boLoc: boLoc, locChon: locChon, thongTin: thongTin, hanVe: hanVe,
    khungNoi: khungNoi, dinhDangDienTich: dinhDangDienTich, taoKml: taoKml, taoZip: taoZip,
    duongDanEarthWeb: duongDanEarthWeb,
  };
})();
