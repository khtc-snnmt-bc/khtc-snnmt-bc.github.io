// ============================================================
// bcsnn · js/pages/ban-do.js
// Vai trò  : Trang bản đồ: nền khoá trong thành phố, bảng lớp (bật/tắt nhóm, tích từng loại — kiêm chú giải),
//            bấm đối tượng → khung thông tin (cạnh phải / trượt lên trên điện thoại): bảng thuộc tính + trang
//            thuyết minh của đối tượng (nếu có); đăng nhập Google → Gmail thuộc đơn vị được quyền thấy thêm
//            lớp Nội bộ / nền ảnh vệ tinh
// Lớp      : pages — được phép gọi: services (BAN_DO_DU_LIEU), domains (BAN_DO), config (CAU_HINH_BAN_DO, CAU_HINH)
// Phiên bản: 0.8.1 · Cập nhật: 14/10/2026 06:30
// Mỗi nhóm lớp một nguồn = một file trên kho (ck-<id> / nb-<id>); nhóm đang tắt thì MapLibre không tải ô của nó.
// ============================================================

(function () {
  'use strict';

  var CONG_KHAI = 'ck';
  var NOI_BO = 'nb';
  // Nhóm Chữ riêng (từ lớp chữ MapInfo/DGN) chưa dùng — tên xã lấy từ vùng ranh xã (domains/ban-do.js)
  function boChu(n) { return n.hinh !== 'chu'; }
  // Bản đồ nền (chọn một). Không dùng tile.openstreetmap.org (DNS Viettel chặn, chỉ cho dùng nhẹ) hay CARTO
  // (đòi API key). Bản đồ đường = dữ liệu OSM tự đóng PMTiles trên kho (ck-nen-duong, bando/cong-cu/nen-duong.py).
  // Ảnh vệ tinh = ô Esri qua Worker (khoá ArcGIS nằm ở Worker); quyen 'veTinh' — chỉ hiện với Gmail có quyền.
  var NEN = [
    { id: 'duong', ten: 'Bản đồ đường', goc: 'ck-nen-duong',
      ghiCong: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>' },
    { id: 'vetinh', ten: 'Ảnh vệ tinh', quyen: 'veTinh',
      ghiCong: 'Powered by <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> | Esri, Maxar, Earthstar Geographics' },
  ].filter(function (n) { return !n.goc || BAN_DO_DU_LIEU.coTep(n.goc); });
  var ZOOM_NHO_NHAT = 8;                 // = MINZOOM lúc cắt PMTiles (day-ban-do.py): nhỏ hơn thì lớp không vẽ
  var KHOA_VE = 'bd_ve';                // sessionStorage: vé Google còn hạn (tải lại trang không phải đăng nhập lại)
  var KHOA_DA_DANG_NHAP = 'bd_da_dn';    // localStorage: máy này từng đăng nhập → lần sau tự đăng nhập lại

  var nhomLop = [];          // mọi nhóm đang có trên bản đồ, mỗi nhóm kèm .nguon
  var loaiDat = {};
  var dangChon = null;       // {nhom, id}
  var daCoNoiBo = false;
  var henLamMoi = null;
  var map;

  function $(id) { return document.getElementById(id); }
  function tao(the, lop, chu) {
    var e = document.createElement(the);
    if (lop) e.className = lop;
    if (chu != null) e.textContent = chu;
    return e;
  }
  function kemNguon(ds, nguon) {
    return ds.filter(boChu).map(function (n) { return Object.assign({ nguon: nguon }, n); });
  }
  function laNguonMinh(ten) { return /^(ck|nb)-/.test(ten); }
  function lop(nhom, phan) { return BAN_DO.maLop(nhom, nhom.nguon, phan); }
  /** Nguồn vector của một nhóm: mỗi nhóm một file trên kho */
  function nguonNhom(nhom) {
    return { type: 'vector', url: BAN_DO_DU_LIEU.nguonPmtiles(BAN_DO.maNguon(nhom, nhom.nguon)) };
  }

  /** Giới hạn kéo theo cỡ màn hình hiện tại: mọi điểm trong thành phố (gồm đảo) kéo được về giữa màn hình */
  function gioiHanKeo() {
    var c = $('ban-do');
    return BAN_DO.khungKeo(CAU_HINH_BAN_DO.KHUNG_GIOI_HAN || CAU_HINH_BAN_DO.KHUNG_THANH_PHO,
      c.clientWidth, c.clientHeight, ZOOM_NHO_NHAT);
  }

  function dungBanDo(nhomCongKhai) {
    BAN_DO_DU_LIEU.noiGiaoThuc(maplibregl, pmtiles);
    var khung = CAU_HINH_BAN_DO.KHUNG_THANH_PHO;
    var nguon = {};
    nhomCongKhai.forEach(function (n) { nguon[BAN_DO.maNguon(n, CONG_KHAI)] = nguonNhom(n); });
    var lopNen = [];
    NEN.forEach(function (n, i) {
      if (n.goc) {
        nguon['nen-' + n.id] = { type: 'vector', url: BAN_DO_DU_LIEU.nguonPmtiles(n.goc), attribution: n.ghiCong };
        n.lop = BAN_DO.lopNenDuong('nen-' + n.id, 'nen-' + n.id + '-');
      } else {
        nguon['nen-' + n.id] = { type: 'raster', tiles: [BAN_DO_DU_LIEU.nguonVeTinh()], tileSize: 256, maxzoom: 19,
          attribution: n.ghiCong };
        n.lop = [{ id: 'nen-' + n.id, type: 'raster', source: 'nen-' + n.id }];
      }
      n.lop.forEach(function (l) { l.layout = Object.assign({}, l.layout, { visibility: i ? 'none' : 'visible' }); });
      lopNen = lopNen.concat(n.lop);
    });
    map = new maplibregl.Map({
      container: 'ban-do',
      bounds: khung,
      maxBounds: gioiHanKeo(),
      minZoom: ZOOM_NHO_NHAT,
      maxZoom: 19,
      dragRotate: false,       // khung nhìn luôn hướng bắc → KMZ phủ đúng
      pitchWithRotate: false,
      attributionControl: { compact: true },
      style: {
        version: 8,
        glyphs: BAN_DO_DU_LIEU.diaChiPhong(maplibregl,
          new URL('../vendor/noto-sans/{fontstack}/{range}.pbf', location.href).href.replace(/%7B/g, '{').replace(/%7D/g, '}')),
        sources: nguon,
        // Lớp bản đồ nằm sẵn trong kiểu ban đầu — không chờ sự kiện 'load' (chờ cả nền tải xong;
        // nền chậm/hỏng thì khoanh đất không bao giờ hiện). Nền đầu tiên bật, các nền khác ẩn.
        layers: lopNen.concat([].concat.apply([], nhomCongKhai.map(function (nhom) { return BAN_DO.lopVe(nhom, CONG_KHAI); }))),
      },
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    nhomCongKhai.forEach(ganSuKien);
    map.on('click', function (e) {
      var trung = map.queryRenderedFeatures(e.point).some(function (f) { return laNguonMinh(f.source); });
      if (!trung) boChon();
    });
    // bản đồ hiện xong lần đầu mới tải ngầm, để không giành đường truyền với ô đang xem
    map.once('idle', function () {
      coTaiTron = BAN_DO.nenTaiTron(navigator.connection, matchMedia('(pointer: fine)').matches);
      taiTronDangBat();
    });
  }

  // ---------- tải ngầm trọn file các lớp Công khai đang bật (Wi-Fi / máy tính) ----------
  var coTaiTron = false;
  var hangTai = Promise.resolve();
  function taiTronDangBat() {
    if (!coTaiTron) return;
    var ds = NEN.filter(function (n) { return n.goc && map.getLayoutProperty(n.lop[0].id, 'visibility') !== 'none'; })
      .map(function (n) { return n.goc; })
      .concat(nhomLop.filter(function (n) { return n.nguon === CONG_KHAI && !n.tat; })
        .map(function (n) { return BAN_DO.maNguon(n, CONG_KHAI); }));
    ds.forEach(function (goc) { hangTai = hangTai.then(function () { return BAN_DO_DU_LIEU.taiTron(goc); }); });
  }

  function ganSuKien(nhom) {
    var phanBam = lop(nhom, nhom.hinh === 'vung' ? 'nen' : nhom.hinh === 'duong' ? 'duong' : 'diem');
    var tienTo = lop(nhom, '');
    map.on('click', phanBam, function (e) {
      if (!e.features.length) return;
      // Ranh giới (chỉ viền) nhường cho đối tượng khác nằm cùng chỗ bấm
      if (nhom.vien && map.queryRenderedFeatures(e.point).some(function (f) {
        return laNguonMinh(f.source) && f.layer.id.indexOf(tienTo) !== 0;
      })) return;
      chon(nhom, e.features[0]);
    });
    map.on('mouseenter', phanBam, function () { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', phanBam, function () { map.getCanvas().style.cursor = ''; });
  }

  // ---------- bảng lớp ----------
  function capNhatLoc(nhom, khoi) {
    var maBat = [].slice.call(khoi.querySelectorAll('input[data-ma]:checked')).map(function (o) { return o.dataset.ma; });
    var loc = BAN_DO.boLoc(nhom, maBat);
    BAN_DO.lopVe(nhom, nhom.nguon).forEach(function (l) {
      if (l.id.slice(-5) !== '-chon') map.setFilter(l.id, loc);
    });
  }

  function batNhom(nhom, bat) {
    BAN_DO.lopVe(nhom, nhom.nguon).forEach(function (l) { map.setLayoutProperty(l.id, 'visibility', bat ? 'visible' : 'none'); });
    nhom.tat = !bat;
    if (!bat && dangChon && dangChon.nhom === nhom) boChon();
    if (bat) taiTronDangBat();
  }

  function dungMucNen() {
    var nen = tao('div', 'bd-nhom bd-nen');
    nen.appendChild(tao('div', 'bd-nhom-dau', 'Bản đồ nền'));
    var dsNen = tao('div', 'bd-loai');
    NEN.concat([{ id: '', ten: 'Không nền' }]).forEach(function (n, i) {
      var dong = tao('label', 'bd-loai-dong');
      if (n.quyen) { dong.hidden = true; dong.dataset.quyen = n.quyen; }
      var o = tao('input'); o.type = 'radio'; o.name = 'bd-nen'; o.value = n.id; o.checked = i === 0;
      o.addEventListener('change', function () { chonNen(n.id); });
      dong.appendChild(o);
      dong.appendChild(tao('span', '', n.ten));
      dsNen.appendChild(dong);
    });
    nen.appendChild(dsNen);
    $('bd-ds-lop').appendChild(nen);
  }

  function hienNen(n, hien) {
    n.lop.forEach(function (l) { map.setLayoutProperty(l.id, 'visibility', hien ? 'visible' : 'none'); });
  }

  function chonNen(id) {
    NEN.forEach(function (x) { hienNen(x, x.id === id); });
    taiTronDangBat();
  }

  /** Hiện / ẩn nền cần quyền theo quyền của Gmail đang đăng nhập (null = chưa đăng nhập) */
  function apQuyenNen(quyen) {
    [].slice.call(document.querySelectorAll('.bd-nen [data-quyen]')).forEach(function (dong) {
      var co = !!(quyen && quyen[dong.dataset.quyen]);
      dong.hidden = !co;
      var o = dong.querySelector('input');
      if (!co && o.checked) {
        var dau = document.querySelector('.bd-nen input');   // nền đầu tiên (không cần quyền) hoặc Không nền
        dau.checked = true;
        chonNen(dau.value);
      }
    });
  }

  function themMucNhom(nhom) {
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
    $('bd-ds-lop').appendChild(khoi);
  }

  function oMau(mau, hinh) {
    var o = tao('span', 'bd-mau bd-mau-' + (hinh || 'vung'));
    o.style.setProperty('--mau', mau || '#888');
    return o;
  }

  // ---------- lớp Nội bộ ----------
  function themNoiBo() {
    if (daCoNoiBo || !BAN_DO_DU_LIEU.coNoiBo()) return;
    daCoNoiBo = true;
    BAN_DO_DU_LIEU.layNhomNoiBo().then(function (ds) {
      var nhom = kemNguon(ds, NOI_BO);
      if (!nhom.length) return;
      function them() {
        nhom.forEach(function (n) {
          map.addSource(BAN_DO.maNguon(n, NOI_BO), nguonNhom(n));
          BAN_DO.lopVe(n, NOI_BO).forEach(function (l) { map.addLayer(l); });
          ganSuKien(n);
          themMucNhom(n);
          nhomLop.push(n);
        });
      }
      // kiểu bản đồ ban đầu phải nạp xong mới thêm nguồn được (không chờ 'load' — 'load' chờ cả nền)
      if (map.style && map.style._loaded) them(); else map.once('style.load', them);
    });
    BAN_DO_DU_LIEU.layLoaiDat(NOI_BO).then(function (ld) { loaiDat = Object.assign({}, loaiDat, ld); });
  }

  // ---------- đăng nhập Google ----------
  function docVeCu() {
    try {
      var v = sessionStorage.getItem(KHOA_VE) || '';
      return BAN_DO.hanVe(v) > Date.now() / 1000 + 60 ? v : '';
    } catch (e) { return ''; }
  }

  function ghiNho(khoa, giaTri, kho) {
    try { if (giaTri) kho.setItem(khoa, giaTri); else kho.removeItem(khoa); } catch (e) { /* riêng tư: bỏ qua */ }
  }

  function daTungDangNhap() {
    try { return localStorage.getItem(KHOA_DA_DANG_NHAP) === '1'; } catch (e) { return false; }
  }

  function nhanVe(ve) {
    BAN_DO_DU_LIEU.datVe(ve);
    BAN_DO_DU_LIEU.layQuyen().then(function (q) {
      if (!q || !q.ok) {   // vé hỏng / hết hạn: về trạng thái chưa đăng nhập
        BAN_DO_DU_LIEU.datVe('');
        ghiNho(KHOA_VE, '', sessionStorage);
        apQuyenNen(null);
        $('bd-dang-nhap').hidden = false;
        $('bd-tai-khoan').hidden = true;
        return;
      }
      ghiNho(KHOA_VE, ve, sessionStorage);
      ghiNho(KHOA_DA_DANG_NHAP, '1', localStorage);
      $('bd-dang-nhap').hidden = true;
      $('bd-tai-khoan').textContent = q.email;
      $('bd-tai-khoan').hidden = false;
      apQuyenNen(q);
      if (q.noiBo) themNoiBo(); else BAN_DO_DU_LIEU.xoaDemNoiBo();
      // vé Google sống ~1 giờ → xin vé mới trước khi hết (không cần bấm)
      clearTimeout(henLamMoi);
      var conGiay = BAN_DO.hanVe(ve) - Date.now() / 1000 - 300;
      henLamMoi = setTimeout(BAN_DO_DU_LIEU.lamMoiVe, Math.max(conGiay, 30) * 1000);
    });
  }

  /** Thư viện Google nạp không đồng bộ → chờ tới khi có (tối đa ~15 s) */
  function khoiTaoDangNhap() {
    var veCu = docVeCu();
    if (veCu) nhanVe(veCu);
    var lan = 0;
    (function cho() {
      if (BAN_DO_DU_LIEU.khoiTaoGoogle($('bd-nut-google'), nhanVe, !veCu && daTungDangNhap())) return;
      if (++lan < 75) setTimeout(cho, 200);
    })();
  }

  // ---------- xuất khung đang xem sang Google Earth ----------
  // Chụp riêng lớp khoanh đất (ẩn nền → ảnh trong suốt) → KMZ phủ lên đúng khung; Google Earth tự có nền của nó.
  function xuatGoogleEarth() {
    var nenCu = NEN.map(function (n) { return map.getLayoutProperty(n.lop[0].id, 'visibility') !== 'none'; });
    NEN.forEach(function (n) { hienNen(n, false); });
    map.once('render', function () {
      var anh = map.getCanvas().toDataURL('image/png');   // đọc ngay trong khung vẽ, trước khi trình duyệt xoá
      NEN.forEach(function (n, i) { hienNen(n, nenCu[i]); });
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
    if (dangChon) map.setFilter(lop(dangChon.nhom, 'chon'), BAN_DO.locChon(null));
    dangChon = { nhom: nhom, id: dt.id };
    map.setFilter(lop(nhom, 'chon'), BAN_DO.locChon(dt.id));
    var tt = BAN_DO.thongTin(nhom, dt.properties, loaiDat);
    $('bd-tt-ten').textContent = tt.tieuDe;
    var dl = $('bd-tt-dong');
    dl.textContent = '';
    tt.dong.forEach(function (d) { dl.appendChild(tao('dt', '', d.nhan)); dl.appendChild(tao('dd', '', d.giaTri)); });
    var nd = $('bd-tt-noi-dung');
    nd.textContent = '';
    tt.noiDung.forEach(function (d) { nd.appendChild(tao('h3', '', d.nhan)); nd.appendChild(tao('p', '', d.giaTri)); });
    anThuyetMinh();
    $('bd-tt').hidden = false;
    var luot = dangChon;
    BAN_DO_DU_LIEU.layThuyetMinh(BAN_DO.maThuyetMinh(nhom.nguon, dt.properties)).then(function (html) {
      if (html && dangChon === luot) hienThuyetMinh(html);
    });
  }

  // Thuyết minh: trang HTML riêng của đối tượng, nằm dưới bảng thuộc tính. Khung cao đúng bằng nội dung →
  // cả khung thông tin cuộn một lần, không có thanh cuộn lồng; không có trang thì không hiện gì.
  function hienThuyetMinh(html) {
    var f = $('bd-tt-tm');
    f.onload = function () { doCao(); };
    f.srcdoc = html;
    f.hidden = false;
    $('bd-tt').classList.add('co-tm');
  }

  function doCao() {
    var f = $('bd-tt-tm');
    if (f.hidden || !f.contentDocument || !f.contentDocument.documentElement) return;
    f.style.height = '0';
    f.style.height = f.contentDocument.documentElement.scrollHeight + 'px';
  }

  function anThuyetMinh() {
    var f = $('bd-tt-tm');
    f.hidden = true;
    f.onload = null;
    f.removeAttribute('srcdoc');
    f.style.height = '';
    $('bd-tt').classList.remove('co-tm');
  }

  function boChon() {
    if (dangChon) map.setFilter(lop(dangChon.nhom, 'chon'), BAN_DO.locChon(null));
    dangChon = null;
    anThuyetMinh();
    $('bd-tt').hidden = true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    nhomLop = kemNguon(CAU_HINH_BAN_DO.NHOM_LOP_CONG_KHAI, CONG_KHAI);
    dungMucNen();
    nhomLop.forEach(themMucNhom);
    $('bd-lop-mo').addEventListener('click', function () { $('bd-lop').classList.toggle('mo'); });
    dungBanDo(nhomLop);
    $('bd-tt-dong-nut').addEventListener('click', boChon);
    window.addEventListener('resize', function () { doCao(); map.setMaxBounds(gioiHanKeo()); });
    $('bd-earth-web').addEventListener('click', function () {
      // mở tab ngay trong lúc bấm (mở trễ sau khi chụp thì trình duyệt chặn cửa sổ bật lên)
      var b = map.getBounds();
      window.open(BAN_DO.duongDanEarthWeb({ w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() }), '_blank');
      xuatGoogleEarth();
    });
    BAN_DO_DU_LIEU.layLoaiDat(CONG_KHAI).then(function (ld) { loaiDat = Object.assign({}, ld, loaiDat); });
    khoiTaoDangNhap();
  });
})();
