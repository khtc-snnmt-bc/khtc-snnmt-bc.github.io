// ============================================================
// bcsnn · js/pages/ban-do.js
// Vai trò  : Trang bản đồ: nền OpenStreetMap khoá trong thành phố, bảng lớp (bật/tắt nhóm, tích từng
//            loại — kiêm chú giải), bấm đối tượng → khung thông tin (cạnh phải / trượt lên trên điện thoại)
// Lớp      : pages — được phép gọi: services (BAN_DO_DU_LIEU), domains (BAN_DO), config (CAU_HINH_BAN_DO)
// Phiên bản: 0.3.0 · Cập nhật: 11/10/2026 22:31
// ============================================================

(function () {
  'use strict';

  var NGUON = 'cong-khai';
  // Nhóm Chữ riêng (từ lớp chữ MapInfo/DGN) chưa dùng — tên xã lấy từ vùng ranh xã (domains/ban-do.js)
  var nhomLop = CAU_HINH_BAN_DO.NHOM_LOP_CONG_KHAI.filter(function (n) { return n.hinh !== 'chu'; });
  // Bản đồ nền (chọn một). Không dùng tile.openstreetmap.org (bị chặn ở máy chủ dự án, chỉ cho dùng nhẹ)
  // hay CARTO (nay đòi API key, in chữ mờ lên ô). Esri bên dưới: điều khoản dùng không khoá chưa rõ —
  // có thể phải đổi sang basemaps-api.arcgis.com kèm API key (xem KE-HOACH.md).
  var NEN = [
    { id: 'duong', ten: 'Bản đồ đường',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
      ghiCong: 'Esri, HERE, Garmin, © OpenStreetMap contributors' },
    { id: 've-tinh', ten: 'Ảnh vệ tinh',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      ghiCong: 'Esri, Maxar, Earthstar Geographics' },
  ];
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
      dragRotate: false,       // khung nhìn luôn hướng bắc → KMZ phủ đúng
      pitchWithRotate: false,
      attributionControl: { compact: true },
      style: {
        version: 8,
        glyphs: new URL('../vendor/noto-sans/{fontstack}/{range}.pbf', location.href).href.replace(/%7B/g, '{').replace(/%7D/g, '}'),
        sources: Object.assign({ [NGUON]: { type: 'vector', url: BAN_DO_DU_LIEU.nguonPmtiles(NGUON) } },
          NEN.reduce(function (kq, n) {
            kq['nen-' + n.id] = { type: 'raster', tileSize: 256, maxzoom: 19, tiles: n.tiles, attribution: n.ghiCong };
            return kq;
          }, {})),
        // Lớp bản đồ nằm sẵn trong kiểu ban đầu — không chờ sự kiện 'load' (chờ cả nền tải xong;
        // nền chậm/hỏng thì khoanh đất không bao giờ hiện). Nền đầu tiên bật, các nền khác ẩn.
        layers: NEN.map(function (n, i) {
          return { id: 'nen-' + n.id, type: 'raster', source: 'nen-' + n.id, layout: { visibility: i ? 'none' : 'visible' } };
        }).concat([].concat.apply([], nhomLop.map(function (nhom) { return BAN_DO.lopVe(nhom, NGUON); }))),
      },
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    nhomLop.forEach(function (nhom) {
      var phanBam = nhom.id + '-' + (nhom.hinh === 'vung' ? 'nen' : nhom.hinh === 'duong' ? 'duong' : 'diem');
      map.on('click', phanBam, function (e) {
        if (!e.features.length) return;
        // Ranh giới (chỉ viền) nhường cho đối tượng khác nằm cùng chỗ bấm
        if (nhom.vien && map.queryRenderedFeatures(e.point).some(function (f) {
          return f.source === NGUON && f.layer.id.indexOf(nhom.id + '-') !== 0;
        })) return;
        chon(nhom, e.features[0]);
      });
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
    var nen = tao('div', 'bd-nhom bd-nen');
    nen.appendChild(tao('div', 'bd-nhom-dau', 'Bản đồ nền'));
    var dsNen = tao('div', 'bd-loai');
    NEN.concat([{ id: '', ten: 'Không nền' }]).forEach(function (n, i) {
      var dong = tao('label', 'bd-loai-dong');
      var o = tao('input'); o.type = 'radio'; o.name = 'bd-nen'; o.checked = i === 0;
      o.addEventListener('change', function () {
        NEN.forEach(function (x) { map.setLayoutProperty('nen-' + x.id, 'visibility', x.id === n.id ? 'visible' : 'none'); });
      });
      dong.appendChild(o);
      dong.appendChild(tao('span', '', n.ten));
      dsNen.appendChild(dong);
    });
    nen.appendChild(dsNen);
    ds.appendChild(nen);
    nhomLop.forEach(function (nhom) {
      var khoi = tao('div', 'bd-nhom');
      var dau = tao('label', 'bd-nhom-dau');
      var o = tao('input'); o.type = 'checkbox'; o.checked = true;
      dau.appendChild(o);
      if (nhom.loai.length <= 1) dau.appendChild(oMau(nhom.loai[0] && nhom.loai[0].mau, nhom.vien ? 'vien' : nhom.hinh));
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
          dong.appendChild(oMau(l.mau, nhom.vien ? 'vien' : nhom.hinh));
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

  // ---------- xuất khung đang xem sang Google Earth ----------
  // Chụp riêng lớp khoanh đất (ẩn nền → ảnh trong suốt) → KMZ phủ lên đúng khung; Google Earth tự có nền của nó.
  function xuatGoogleEarth() {
    var nenCu = NEN.map(function (n) { return map.getLayoutProperty('nen-' + n.id, 'visibility'); });
    function datNen(ds) { NEN.forEach(function (n, i) { map.setLayoutProperty('nen-' + n.id, 'visibility', ds[i]); }); }
    datNen(NEN.map(function () { return 'none'; }));
    map.once('render', function () {
      var anh = map.getCanvas().toDataURL('image/png');   // đọc ngay trong khung vẽ, trước khi trình duyệt xoá
      datNen(nenCu);
      var nhi = atob(anh.split(',')[1]), byte = new Uint8Array(nhi.length);
      for (var i = 0; i < nhi.length; i++) byte[i] = nhi.charCodeAt(i);
      var b = map.getBounds();
      var kml = BAN_DO.taoKml({ w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() },
        'anh.png', 'Khoanh đất');
      var zip = BAN_DO.taoZip([{ ten: 'doc.kml', byte: new TextEncoder().encode(kml) }, { ten: 'anh.png', byte: byte }]);
      var a = tao('a');
      a.href = URL.createObjectURL(new Blob([zip], { type: 'application/vnd.google-earth.kmz' }));
      a.download = 'ban-do-khung-nhin.kmz';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    map.triggerRepaint();
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
    $('bd-earth-web').addEventListener('click', function () {
      // mở tab ngay trong lúc bấm (mở trễ sau khi chụp thì trình duyệt chặn cửa sổ bật lên)
      var b = map.getBounds();
      window.open(BAN_DO.duongDanEarthWeb({ w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() }), '_blank');
      xuatGoogleEarth();
    });
    BAN_DO_DU_LIEU.layLoaiDat(NGUON).then(function (ld) { loaiDat = ld; });
  });
})();
