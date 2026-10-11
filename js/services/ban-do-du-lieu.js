// ============================================================
// bcsnn · js/services/ban-do-du-lieu.js
// Vai trò  : Nói chuyện với kho file bản đồ: nối giao thức pmtiles:// cho MapLibre, lấy nội dung loại đất
// Lớp      : services — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.1.0 · Cập nhật: 11/10/2026 11:00
// ============================================================
// Kho = CAU_HINH_BAN_DO.KHO (tạm: máy chủ thử trên máy; b12d: Cloudflare Worker, kèm vé Google cho file nội bộ).

var BAN_DO_DU_LIEU = (function () {
  'use strict';

  var daNoi = false;

  /** Nối giao thức pmtiles:// vào MapLibre (một lần) */
  function noiGiaoThuc(maplibregl, pmtiles) {
    if (daNoi) return;
    var giaoThuc = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', giaoThuc.tile);
    daNoi = true;
  }

  function diaChi(tenTep) {
    return new URL(CAU_HINH_BAN_DO.KHO + tenTep, location.href).href;
  }

  /** Địa chỉ nguồn vector cho MapLibre: 'cong-khai' | 'noi-bo' */
  function nguonPmtiles(ten) {
    return 'pmtiles://' + diaChi(ten + '.pmtiles');
  }

  /** Nội dung theo loại đất; lỗi thì trả {} (bản đồ vẫn xem được) */
  function layLoaiDat(ten) {
    return fetch(diaChi(ten + '-loai-dat.json'), { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }

  return { noiGiaoThuc: noiGiaoThuc, nguonPmtiles: nguonPmtiles, layLoaiDat: layLoaiDat };
})();
