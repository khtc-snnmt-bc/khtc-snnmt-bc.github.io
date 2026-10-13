// ============================================================
// bcsnn · js/services/ban-do-du-lieu.js
// Vai trò  : Nói chuyện với kho file bản đồ (Cloudflare Worker): nối giao thức pmtiles:// cho MapLibre qua
//            nguồn CÓ CẤT (Cache Storage), gắn vé Google cho file Nội bộ, hỏi quyền, lấy nhóm lớp Nội bộ
//            + nội dung loại đất + trang thuyết minh đối tượng; ô ảnh vệ tinh (vetinh://, kèm vé);
//            đăng nhập Google (thư viện GIS, vé ID token)
// Lớp      : services — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.7.0 · Cập nhật: 13/10/2026 15:10
// ============================================================
// Tải trọn (taiTron): cả file lớp Công khai vào bộ cất một lần → các đoạn sau cắt từ bản trọn, không hỏi mạng.
// Mỗi lớp một file trên kho: ck-<nhóm> (Công khai), nb-<nhóm> (Nội bộ — kèm vé Google). Tên file mang phiên bản
// theo nội dung (vd ck-khoanh_dat.6b263269.pmtiles) nên KHÔNG BAO GIỜ đổi. Phiên bản file Công khai +
// nb-cau-hinh ở CAU_HINH_BAN_DO.PHIEN_BAN; phiên bản file Nội bộ nằm trong nb-cau-hinh (chỉ người có quyền đọc).
// Mọi đoạn byte đã tải cất vào Cache Storage "bd-<file>-<phiên bản>" và dùng lại mãi; đẩy bản đồ mới thì chỉ
// file đổi có phiên bản mới, bộ cất của phiên bản cũ bị xoá. (Thư viện pmtiles tự tắt bộ nhớ HTTP trên
// Chrome/Windows nên phải tự cất.) Không có Cache Storage (trình duyệt cũ) thì tải thẳng như thường.

var BAN_DO_DU_LIEU = (function () {
  'use strict';

  var PHIEN = Object.assign({}, CAU_HINH_BAN_DO.PHIEN_BAN || {});
  // các dải phông đã chép vào app/vendor/noto-sans/ (thêm dải thì thêm ở đây; kiểm: bando/cong-cu/dai-chu.mjs)
  var DAI_PHONG = ['0-255', '256-511', '768-1023', '1024-1279', '7680-7935', '8192-8447'];
  var giaoThuc = null;
  var daNoi = {};          // file pmtiles đã nối vào giao thức
  var tron = {};           // file → Promise<Blob | null>: trọn file đã cất
  var dangTaiTron = {};    // file → Promise: đang / đã tải trọn trong phiên này
  var ve = '';
  var coDem = typeof caches !== 'undefined';

  function laNoiBo(goc) { return goc.indexOf('nb-') === 0; }
  function tenTep(goc, duoi) {
    return goc + '.' + PHIEN[goc] + duoi;
  }
  function diaChi(tenTep) {
    return new URL(CAU_HINH_BAN_DO.KHO + tenTep, location.href).href;
  }
  function tenDem(goc) {
    return 'bd-' + goc + '-' + PHIEN[goc];
  }
  function dauVe(goc) {
    var h = new Headers();
    if (ve && laNoiBo(goc)) h.set('Authorization', 'Bearer ' + ve);
    return h;
  }

  /**
   * Xoá bộ cất không còn dùng: phiên bản cũ của file trong phạm vi (laTrongPhamVi(goc) = true) + bộ cất kiểu cũ
   * (gói chung cong-khai / noi-bo).
   */
  function donDem(laTrongPhamVi) {
    if (!coDem) return;
    caches.keys().then(function (ds) {
      ds.forEach(function (t) {
        if (t.indexOf('bd-') !== 0) return;
        var m = /^bd-(.+)-([0-9a-f]{8})$/.exec(t);
        var cu = !m || !/^(ck|nb)-/.test(m[1]);
        if (cu || (laTrongPhamVi(m[1]) && PHIEN[m[1]] !== m[2])) caches.delete(t);
      });
    }).catch(function () { /* bỏ qua */ });
  }

  /** Tải (có cất): khoá = địa chỉ + đoạn byte. tai() trả Promise<ArrayBuffer> */
  function layCoCat(goc, khoa, tai) {
    if (!coDem) return tai();
    return caches.open(tenDem(goc)).then(function (dem) {
      return dem.match(khoa).then(function (cu) {
        if (cu) return cu.arrayBuffer();
        return tai().then(function (du) {
          dem.put(khoa, new Response(du.slice(0))).catch(function () { /* đầy bộ nhớ: bỏ qua */ });
          return du;
        });
      });
    }, tai);
  }

  /** Trọn file đã cất (khoá = địa chỉ, không đoạn byte) → Promise<Blob | null>; hỏi bộ cất một lần mỗi phiên */
  function blobTron(goc) {
    if (!coDem) return Promise.resolve(null);
    if (!tron[goc]) {
      var url = diaChi(tenTep(goc, '.pmtiles'));
      tron[goc] = caches.open(tenDem(goc)).then(function (dem) { return dem.match(url); })
        .then(function (r) { return r ? r.blob() : null; })
        .catch(function () { return null; });
    }
    return tron[goc];
  }

  /**
   * Tải ngầm TRỌN một file lớp Công khai vào bộ cất (một lượt Worker cho mỗi file mỗi phiên bản), thay các đoạn lẻ
   * đã cất → từ đó mọi vùng của lớp xem được không cần mạng, kể cả khi hàng rào hạn mức tắt Worker.
   * Lỗi giữa chừng thì bỏ qua, lần mở trang sau thử lại. Trang tự quyết khi nào nên tải (Wi-Fi / máy tính).
   */
  function taiTron(goc) {
    if (!coDem || !PHIEN[goc] || laNoiBo(goc)) return Promise.resolve();
    if (!dangTaiTron[goc]) {
      var url = diaChi(tenTep(goc, '.pmtiles'));
      dangTaiTron[goc] = blobTron(goc).then(function (b) {
        if (b) return null;
        return fetch(url, { cache: 'no-store' }).then(function (r) {
          if (r.status !== 200) throw new Error('Kho bản đồ trả lỗi ' + r.status);
          return caches.delete(tenDem(goc))
            .then(function () { return caches.open(tenDem(goc)); })
            .then(function (dem) { return dem.put(url, r); });
        }).then(function () { delete tron[goc]; });
      }).catch(function () { /* lần sau thử lại */ });
    }
    return dangTaiTron[goc];
  }

  /** Nguồn PMTiles có cất — cùng giao diện với pmtiles.FetchSource (getKey, getBytes) */
  function NguonCoCat(goc) {
    this.goc = goc;
    this.url = diaChi(tenTep(goc, '.pmtiles'));
  }
  NguonCoCat.prototype.getKey = function () { return this.url; };
  NguonCoCat.prototype.getBytes = function (dau, doDai, signal) {
    var goc = this.goc;
    var dt = this;
    return blobTron(goc).then(function (b) {
      if (b) return b.slice(dau, dau + doDai).arrayBuffer().then(function (du) { return { data: du }; });
      return dt.layDoan(dau, doDai, signal);
    });
  };
  NguonCoCat.prototype.layDoan = function (dau, doDai, signal) {
    var url = this.url, goc = this.goc;
    return layCoCat(goc, url + '?r=' + dau + '-' + doDai, function () {
      var h = dauVe(goc);
      h.set('Range', 'bytes=' + dau + '-' + (dau + doDai - 1));
      return fetch(url, { signal: signal, headers: h, cache: 'no-store' }).then(function (r) {
        if (r.status >= 300) throw new Error('Kho bản đồ trả lỗi ' + r.status);
        return r.arrayBuffer();
      }).then(function (du) {
        if (du.byteLength > doDai) throw new Error('Kho bản đồ không trả đúng đoạn byte');
        return du;
      });
    }).then(function (du) { return { data: du }; });
  };

  /** Nối giao thức pmtiles:// vào MapLibre (một lần); dọn bộ cất cũ của file Công khai */
  function noiGiaoThuc(maplibregl, pmtiles) {
    if (giaoThuc) return;
    giaoThuc = { p: new pmtiles.Protocol(), PMTiles: pmtiles.PMTiles };
    maplibregl.addProtocol('pmtiles', giaoThuc.p.tile);
    // ô ảnh vệ tinh: Worker kiểm vé rồi lấy ô Esri bằng khoá ArcGIS của Worker (khoá không xuống trình duyệt)
    maplibregl.addProtocol('vetinh', function (yc, huy) {
      var h = new Headers({ Authorization: 'Bearer ' + ve });
      return fetch(diaChi(yc.url.replace('vetinh://', 'vt/')), { headers: h, signal: huy && huy.signal })
        .then(function (r) {
          if (!r.ok) throw new Error('Ảnh vệ tinh: ' + r.status);
          return r.arrayBuffer();
        }).then(function (du) { return { data: du }; });
    });
    donDem(function (goc) { return !laNoiBo(goc) || goc === 'nb-cau-hinh'; });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () { /* bỏ qua */ });
  }

  /**
   * Phông nhãn: trả địa chỉ 'phong://{fontstack}/{range}' cho kiểu bản đồ. Dải có trong app/vendor/noto-sans tải từ
   * mau (địa chỉ thật, có {fontstack} {range}); dải khác (Khmer, chữ Hán…) trả rỗng, chữ đó không hiện — để lỗi 404
   * thì MapLibre BỎ CẢ Ô bản đồ chứa chữ ấy.
   */
  function diaChiPhong(maplibregl, mau) {
    maplibregl.addProtocol('phong', function (yc) {
      var m = /^phong:\/\/([^/]+)\/(\d+-\d+)$/.exec(yc.url);
      if (!m || DAI_PHONG.indexOf(m[2]) < 0) return Promise.resolve({ data: new ArrayBuffer(0) });
      return fetch(mau.replace('{fontstack}', m[1]).replace('{range}', m[2]))
        .then(function (r) { return r.ok ? r.arrayBuffer() : new ArrayBuffer(0); })
        .catch(function () { return new ArrayBuffer(0); })
        .then(function (du) { return { data: du }; });
    });
    return 'phong://{fontstack}/{range}';
  }

  /** Địa chỉ nguồn vector cho MapLibre của một file lớp ('ck-khoanh_dat'…) — nối nguồn có cất lần đầu */
  function nguonPmtiles(goc) {
    if (!daNoi[goc]) {
      daNoi[goc] = true;
      giaoThuc.p.add(new giaoThuc.PMTiles(new NguonCoCat(goc)));
    }
    return 'pmtiles://' + diaChi(tenTep(goc, '.pmtiles'));
  }

  /** Mẫu địa chỉ ô ảnh vệ tinh cho nguồn raster của MapLibre */
  function nguonVeTinh() { return 'vetinh://{z}/{y}/{x}'; }

  /** Lần đẩy bản đồ gần nhất có lớp Nội bộ không */
  function coNoiBo() { return !!PHIEN['nb-cau-hinh']; }

  /** Kho có file này không (vd nền 'ck-nen-duong' chưa đẩy thì không có) */
  function coTep(goc) { return !!PHIEN[goc]; }

  /** Vé Google (ID token) gửi kèm mọi yêu cầu file Nội bộ; '' = bỏ */
  function datVe(veMoi) { ve = veMoi || ''; }

  function layJson(goc) {
    if (!PHIEN[goc]) return Promise.resolve(null);
    var url = diaChi(tenTep(goc, '.json'));
    return layCoCat(goc, url, function () {
      return fetch(url, { headers: dauVe(goc) }).then(function (r) {
        if (!r.ok) throw new Error('Kho bản đồ trả lỗi ' + r.status);
        return r.arrayBuffer();
      });
    }).then(function (du) { return JSON.parse(new TextDecoder().decode(du)); })
      .catch(function () { return null; });
  }

  /**
   * Trang thuyết minh 'ck-tm/<bảng>/<id>' | 'nb-tm/…' → Promise<chuỗi HTML | null>. Không có trong danh sách phiên bản
   * (đối tượng không có trang) thì null ngay, không hỏi kho. Tên có phiên bản → bộ nhớ HTTP của trình duyệt giữ.
   */
  function layThuyetMinh(goc) {
    if (!goc || !PHIEN[goc]) return Promise.resolve(null);
    return fetch(diaChi(tenTep(goc, '.html')), { headers: dauVe(goc) })
      .then(function (r) { return r.ok ? r.text() : null; })
      .catch(function () { return null; });
  }

  /** Nội dung theo loại đất của quyền 'ck' | 'nb'; lỗi thì trả {} (bản đồ vẫn xem được) */
  function layLoaiDat(tienTo) {
    return layJson(tienTo + '-loai-dat').then(function (kq) { return kq || {}; });
  }

  /**
   * Nhóm lớp Nội bộ (như CAU_HINH_BAN_DO.NHOM_LOP_CONG_KHAI) — Worker chỉ trả khi có quyền. Ghi nhận phiên bản
   * các file Nội bộ rồi dọn bộ cất cũ của chúng.
   */
  function layNhomNoiBo() {
    return layJson('nb-cau-hinh').then(function (kq) {
      if (!kq) return [];
      Object.assign(PHIEN, kq.phienBan || {});
      donDem(function (goc) { return laNoiBo(goc) && goc !== 'nb-cau-hinh'; });
      return kq.nhom || [];
    });
  }

  /** Gmail không còn quyền xem Nội bộ → xoá mọi phần Nội bộ đã cất trên máy */
  function xoaDemNoiBo() {
    if (!coDem) return;
    caches.keys().then(function (ds) {
      ds.forEach(function (t) { if (t.indexOf('bd-nb-') === 0) caches.delete(t); });
    }).catch(function () { /* bỏ qua */ });
  }

  /** Quyền của vé đang giữ → { ok, email, noiBo, veTinh } | null (vé hỏng, hết hạn, mạng lỗi) */
  function layQuyen() {
    var h = new Headers({ Authorization: 'Bearer ' + ve });
    return fetch(diaChi('quyen'), { cache: 'no-store', headers: h })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /**
   * Đăng nhập Google: vẽ nút nhỏ của Google vào phần tử `cho`; có vé thì gọi khiCoVe(ve).
   * tuDong = true: thử đăng nhập lại không cần bấm (người đã đăng nhập trước đó trên máy này).
   * @returns {boolean} false nếu thư viện Google chưa tải
   */
  function khoiTaoGoogle(cho, khiCoVe, tuDong) {
    var g = window.google;
    if (!g || !g.accounts || !g.accounts.id) return false;
    g.accounts.id.initialize({
      client_id: CAU_HINH.GOOGLE_CLIENT_ID,
      callback: function (res) { if (res && res.credential) khiCoVe(res.credential); },
      auto_select: true,
      use_fedcm_for_prompt: true,
    });
    if (cho) g.accounts.id.renderButton(cho, { type: 'standard', size: 'medium', text: 'signin_with', shape: 'pill', locale: 'vi' });
    if (tuDong) g.accounts.id.prompt();
    return true;
  }

  /** Xin vé mới không cần bấm (vé cũ sắp hết hạn) */
  function lamMoiVe() {
    var g = window.google;
    if (g && g.accounts && g.accounts.id) g.accounts.id.prompt();
  }

  return {
    noiGiaoThuc: noiGiaoThuc, diaChiPhong: diaChiPhong, nguonPmtiles: nguonPmtiles, nguonVeTinh: nguonVeTinh, coNoiBo: coNoiBo, coTep: coTep, taiTron: taiTron,
    datVe: datVe, layLoaiDat: layLoaiDat,
    layQuyen: layQuyen, layNhomNoiBo: layNhomNoiBo, xoaDemNoiBo: xoaDemNoiBo, layThuyetMinh: layThuyetMinh,
    khoiTaoGoogle: khoiTaoGoogle, lamMoiVe: lamMoiVe,
  };
})();
