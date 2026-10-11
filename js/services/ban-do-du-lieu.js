// ============================================================
// bcsnn · js/services/ban-do-du-lieu.js
// Vai trò  : Nói chuyện với kho file bản đồ (Cloudflare Worker): nối giao thức pmtiles:// cho MapLibre qua
//            nguồn CÓ CẤT (Cache Storage), gắn vé Google cho file Nội bộ, hỏi quyền, lấy nhóm lớp Nội bộ
//            + nội dung loại đất; đăng nhập Google (thư viện GIS, vé ID token)
// Lớp      : services — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.3.0 · Cập nhật: 11/10/2026 23:37
// ============================================================
// Tận dụng bộ nhớ trình duyệt: file trên kho mang phiên bản theo nội dung (CAU_HINH_BAN_DO.PHIEN_BAN,
// vd cong-khai.6b263269.pmtiles) nên KHÔNG BAO GIỜ đổi. Mọi đoạn byte đã tải (đầu file, thư mục, ô bản đồ, json)
// cất vào Cache Storage "bd-<quyền>-<phiên bản>" và dùng lại mãi, kể cả lần mở sau. Đẩy bản đồ mới → phiên bản
// mới → chỉ tải phần mới; bộ cất của phiên bản cũ bị xoá khi mở trang. (Thư viện pmtiles tự tắt bộ nhớ HTTP
// trên Chrome/Windows nên phải tự cất.) Không có Cache Storage (trình duyệt cũ) thì tải thẳng như thường.

var BAN_DO_DU_LIEU = (function () {
  'use strict';

  var PHIEN = CAU_HINH_BAN_DO.PHIEN_BAN || {};
  var giaoThuc = null;
  var ve = '';
  var coDem = typeof caches !== 'undefined';

  function tenTep(quyen, phan, duoi) {
    return quyen + phan + '.' + PHIEN[quyen] + duoi;
  }
  function diaChi(tenTep) {
    return new URL(CAU_HINH_BAN_DO.KHO + tenTep, location.href).href;
  }
  function tenDem(quyen) {
    return 'bd-' + quyen + '-' + PHIEN[quyen];
  }
  function dauVe(quyen) {
    var h = new Headers();
    if (ve && quyen === 'noi-bo') h.set('Authorization', 'Bearer ' + ve);
    return h;
  }

  /** Bộ cất của phiên bản cũ (đã có bản đồ mới) → xoá; xin trình duyệt giữ bộ nhớ lâu dài */
  function donDemCu() {
    if (!coDem) return;
    var dung = Object.keys(PHIEN).map(tenDem);
    caches.keys().then(function (ds) {
      ds.forEach(function (t) { if (t.indexOf('bd-') === 0 && dung.indexOf(t) < 0) caches.delete(t); });
    }).catch(function () { /* bỏ qua */ });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () { /* bỏ qua */ });
  }

  /** Tải (có cất): khoá = địa chỉ + đoạn byte. tai() trả Promise<ArrayBuffer> */
  function layCoCat(quyen, khoa, tai) {
    if (!coDem) return tai();
    return caches.open(tenDem(quyen)).then(function (dem) {
      return dem.match(khoa).then(function (cu) {
        if (cu) return cu.arrayBuffer();
        return tai().then(function (du) {
          dem.put(khoa, new Response(du.slice(0))).catch(function () { /* đầy bộ nhớ: bỏ qua */ });
          return du;
        });
      });
    }, tai);
  }

  /** Nguồn PMTiles có cất — cùng giao diện với pmtiles.FetchSource (getKey, getBytes) */
  function NguonCoCat(quyen) {
    this.quyen = quyen;
    this.url = diaChi(tenTep(quyen, '', '.pmtiles'));
  }
  NguonCoCat.prototype.getKey = function () { return this.url; };
  NguonCoCat.prototype.getBytes = function (dau, doDai, signal) {
    var url = this.url, quyen = this.quyen;
    return layCoCat(quyen, url + '?r=' + dau + '-' + doDai, function () {
      var h = dauVe(quyen);
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

  /** Nối giao thức pmtiles:// vào MapLibre (một lần), mỗi quyền có phiên bản một nguồn có cất */
  function noiGiaoThuc(maplibregl, pmtiles) {
    if (giaoThuc) return;
    giaoThuc = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', giaoThuc.tile);
    Object.keys(PHIEN).forEach(function (q) { giaoThuc.add(new pmtiles.PMTiles(new NguonCoCat(q))); });
    donDemCu();
  }

  /** Địa chỉ nguồn vector cho MapLibre: 'cong-khai' | 'noi-bo' */
  function nguonPmtiles(quyen) {
    return 'pmtiles://' + diaChi(tenTep(quyen, '', '.pmtiles'));
  }

  /** Quyền này có file trên kho không (đẩy bản đồ chưa có lớp Nội bộ thì không) */
  function coQuyen(quyen) { return !!PHIEN[quyen]; }

  /** Vé Google (ID token) gửi kèm mọi yêu cầu file Nội bộ; '' = bỏ */
  function datVe(veMoi) { ve = veMoi || ''; }

  function layJson(quyen, phan) {
    if (!PHIEN[quyen]) return Promise.resolve(null);
    var url = diaChi(tenTep(quyen, phan, '.json'));
    return layCoCat(quyen, url, function () {
      return fetch(url, { headers: dauVe(quyen) }).then(function (r) {
        if (!r.ok) throw new Error('Kho bản đồ trả lỗi ' + r.status);
        return r.arrayBuffer();
      });
    }).then(function (du) { return JSON.parse(new TextDecoder().decode(du)); })
      .catch(function () { return null; });
  }

  /** Nội dung theo loại đất; lỗi thì trả {} (bản đồ vẫn xem được) */
  function layLoaiDat(quyen) {
    return layJson(quyen, '-loai-dat').then(function (kq) { return kq || {}; });
  }

  /** Nhóm lớp Nội bộ (như CAU_HINH_BAN_DO.NHOM_LOP_CONG_KHAI) — Worker chỉ trả khi có quyền */
  function layNhomNoiBo() {
    return layJson('noi-bo', '-cau-hinh').then(function (kq) { return (kq && kq.nhom) || []; });
  }

  /** Gmail không còn quyền xem Nội bộ → xoá phần Nội bộ đã cất trên máy */
  function xoaDemNoiBo() {
    if (coDem && PHIEN['noi-bo']) caches.delete(tenDem('noi-bo')).catch(function () { /* bỏ qua */ });
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
    noiGiaoThuc: noiGiaoThuc, nguonPmtiles: nguonPmtiles, coQuyen: coQuyen, datVe: datVe, layLoaiDat: layLoaiDat,
    layQuyen: layQuyen, layNhomNoiBo: layNhomNoiBo, xoaDemNoiBo: xoaDemNoiBo,
    khoiTaoGoogle: khoiTaoGoogle, lamMoiVe: lamMoiVe,
  };
})();
