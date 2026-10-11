// ============================================================
// bcsnn · js/domains/ban-do.js
// Vai trò  : Nghiệp vụ thuần của bản đồ: dựng kiểu vẽ MapLibre cho từng nhóm lớp, bộ lọc theo loại
//            đang bật, các dòng hiện ở khung thông tin khi bấm đối tượng
// Lớp      : domains — được gọi bởi: pages · được phép gọi: config (không chạm DOM, không gọi services)
// Phiên bản: 0.1.0 · Cập nhật: 11/10/2026 11:00
// ============================================================
// Nhóm lớp (sinh từ danh-sach-lop.xlsx): { id, ten, hinh: 'vung'|'duong'|'diem', loai: [{ma, ten, mau}] }
// Mỗi nhóm là một lớp trong file PMTiles (tên = id); đối tượng có cột `loai` = mã loại.

var BAN_DO = (function () {
  'use strict';

  var TEN_COT = { loai: 'Loại', dien_tich_m2: 'Diện tích' };
  var COT_AN = { mvt_id: true };

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

  /** Các lớp vẽ MapLibre của một nhóm. Id lớp vẽ = <id nhóm>-<phần> */
  function lopVe(nhom, nguon) {
    var mau = bieuThucMau(nhom);
    var chung = { source: nguon, 'source-layer': nhom.id };
    function lop(phan, kieu, paint, them) {
      var l = Object.assign({ id: nhom.id + '-' + phan, type: kieu, paint: paint }, chung, them || {});
      return l;
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

  /** Khung thành phố [tây, nam, đông, bắc] nới thêm một phần để kéo bản đồ không bị cứng */
  function khungNoi(khung, tiLe) {
    var dx = (khung[2] - khung[0]) * tiLe, dy = (khung[3] - khung[1]) * tiLe;
    return [[khung[0] - dx, khung[1] - dy], [khung[2] + dx, khung[3] + dy]];
  }

  return {
    lopVe: lopVe, boLoc: boLoc, locChon: locChon, thongTin: thongTin,
    khungNoi: khungNoi, dinhDangDienTich: dinhDangDienTich,
  };
})();
