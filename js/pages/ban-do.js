// ============================================================
// bcsnn · js/pages/ban-do.js
// Vai trò  : Trang bản đồ: nền OpenStreetMap khoá trong thành phố, bảng lớp (bật/tắt nhóm, tích từng
//            loại — kiêm chú giải), bấm đối tượng → khung thông tin (cạnh phải / trượt lên trên điện thoại)
// Lớp      : pages — được phép gọi: services (BAN_DO_DU_LIEU), domains (BAN_DO), config (CAU_HINH_BAN_DO)
// Phiên bản: 0.1.0 · Cập nhật: 11/10/2026 11:00
// ============================================================

(function () {
  'use strict';

  var NGUON = 'cong-khai';
  // Nhóm Chữ (nhãn) cần bộ phông chữ cho MapLibre — chưa có, tạm không hiện
  var nhomLop = CAU_HINH_BAN_DO.NHOM_LOP_CONG_KHAI.filter(function (n) { return n.hinh !== 'chu'; });
  var loaiDat = {};
  var dangChon = null;      // {nhom, id}
  var map;

  function $(id) { return document.getElementById(id); }
  function tao(the, lop, chu) {
    var e = document.createElement(the);
    if (lop) e.className = lop;
    if (chu != null) e.textContent = chu;
    return e;
  }

  function dungBanDo() {
    BAN_DO_DU_LIEU.noiGiaoThuc(maplibregl, pmtiles);
    var khung = CAU_HINH_BAN_DO.KHUNG_THANH_PHO;
    map = new maplibregl.Map({
      container: 'ban-do',
      bounds: khung,
      maxBounds: BAN_DO.khungNoi(khung, 0.15),
      minZoom: 8,
      maxZoom: 19,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster', tileSize: 256, maxzoom: 19,
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
          },
          [NGUON]: { type: 'vector', url: BAN_DO_DU_LIEU.nguonPmtiles(NGUON) },
        },
        // Lớp bản đồ nằm sẵn trong kiểu ban đầu — không chờ sự kiện 'load' (chờ cả nền OSM tải xong;
        // nền chậm/hỏng thì khoanh đất không bao giờ hiện)
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }].concat(
          [].concat.apply([], nhomLop.map(function (nhom) { return BAN_DO.lopVe(nhom, NGUON); }))),
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    nhomLop.forEach(function (nhom) {
      var phanBam = nhom.id + '-' + (nhom.hinh === 'vung' ? 'nen' : nhom.hinh === 'duong' ? 'duong' : 'diem');
      map.on('click', phanBam, function (e) { if (e.features.length) chon(nhom, e.features[0]); });
      map.on('mouseenter', phanBam, function () { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', phanBam, function () { map.getCanvas().style.cursor = ''; });
    });
    map.on('click', function (e) {
      var trung = map.queryRenderedFeatures(e.point).some(function (f) { return f.source === NGUON; });
      if (!trung) boChon();
    });
  }

  // ---------- bảng lớp ----------
  function capNhatLoc(nhom, khoi) {
    var maBat = [].slice.call(khoi.querySelectorAll('input[data-ma]:checked')).map(function (o) { return o.dataset.ma; });
    var loc = BAN_DO.boLoc(nhom, maBat);
    BAN_DO.lopVe(nhom, NGUON).forEach(function (l) {
      if (l.id.slice(-5) !== '-chon') map.setFilter(l.id, loc);
    });
  }

  function batNhom(nhom, bat) {
    BAN_DO.lopVe(nhom, NGUON).forEach(function (l) { map.setLayoutProperty(l.id, 'visibility', bat ? 'visible' : 'none'); });
    if (!bat && dangChon && dangChon.nhom === nhom) boChon();
  }

  function dungBangLop() {
    var ds = $('bd-ds-lop');
    nhomLop.forEach(function (nhom) {
      var khoi = tao('div', 'bd-nhom');
      var dau = tao('label', 'bd-nhom-dau');
      var o = tao('input'); o.type = 'checkbox'; o.checked = true;
      dau.appendChild(o);
      if (nhom.loai.length <= 1) dau.appendChild(oMau(nhom.loai[0] && nhom.loai[0].mau, nhom.hinh));
      dau.appendChild(tao('span', '', nhom.ten));
      khoi.appendChild(dau);
      o.addEventListener('change', function () { batNhom(nhom, o.checked); khoi.classList.toggle('tat', !o.checked); });
      if (nhom.loai.length > 1) {
        var dsLoai = tao('div', 'bd-loai');
        nhom.loai.forEach(function (l) {
          var dong = tao('label', 'bd-loai-dong');
          var ol = tao('input'); ol.type = 'checkbox'; ol.checked = true; ol.dataset.ma = l.ma;
          ol.addEventListener('change', function () { capNhatLoc(nhom, khoi); });
          dong.appendChild(ol);
          dong.appendChild(oMau(l.mau, nhom.hinh));
          dong.appendChild(tao('span', '', l.ten));
          dsLoai.appendChild(dong);
        });
        khoi.appendChild(dsLoai);
      }
      ds.appendChild(khoi);
    });
    $('bd-lop-mo').addEventListener('click', function () { $('bd-lop').classList.toggle('mo'); });
  }

  function oMau(mau, hinh) {
    var o = tao('span', 'bd-mau bd-mau-' + (hinh || 'vung'));
    o.style.setProperty('--mau', mau || '#888');
    return o;
  }

  // ---------- khung thông tin ----------
  function chon(nhom, dt) {
    if (dangChon) map.setFilter(dangChon.nhom.id + '-chon', BAN_DO.locChon(null));
    dangChon = { nhom: nhom, id: dt.id };
    map.setFilter(nhom.id + '-chon', BAN_DO.locChon(dt.id));
    var tt = BAN_DO.thongTin(nhom, dt.properties, loaiDat);
    $('bd-tt-ten').textContent = tt.tieuDe;
    var dl = $('bd-tt-dong');
    dl.textContent = '';
    tt.dong.forEach(function (d) { dl.appendChild(tao('dt', '', d.nhan)); dl.appendChild(tao('dd', '', d.giaTri)); });
    var nd = $('bd-tt-noi-dung');
    nd.textContent = '';
    tt.noiDung.forEach(function (d) { nd.appendChild(tao('h3', '', d.nhan)); nd.appendChild(tao('p', '', d.giaTri)); });
    $('bd-tt').hidden = false;
  }

  function boChon() {
    if (dangChon) map.setFilter(dangChon.nhom.id + '-chon', BAN_DO.locChon(null));
    dangChon = null;
    $('bd-tt').hidden = true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    dungBangLop();
    dungBanDo();
    $('bd-tt-dong-nut').addEventListener('click', boChon);
    BAN_DO_DU_LIEU.layLoaiDat(NGUON).then(function (ld) { loaiDat = ld; });
  });
})();
