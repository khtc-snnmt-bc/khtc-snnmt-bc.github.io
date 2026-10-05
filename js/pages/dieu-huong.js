// ============================================================
// bcsnn · js/pages/dieu-huong.js
// Vai trò  : Màn hình điều hướng (pptx trang 1): chọn lĩnh vực báo cáo
// Lớp      : pages — được gọi bởi: app (index.html) · được phép gọi: utils
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 06:05
// ============================================================
// Ô "Báo cáo định kỳ…" là link thường (<a href>) sang app khác — không cần JS.
// Ô chưa làm chỉ là chữ, không gắn sự kiện.

var PAGE_DIEU_HUONG = (function () {
  'use strict';

  var elTrang;

  function khoiTao(callbackChonLinhVuc) {
    elTrang = DOM.$('#trang-dieu-huong');
    DOM.$('#o-linh-vuc-bttdc').addEventListener('click', function () {
      an();
      if (typeof callbackChonLinhVuc === 'function') callbackChonLinhVuc('bttdc');
    });
  }

  function hien() {
    DOM.hien(elTrang);
  }

  function an() {
    DOM.an(elTrang);
  }

  return { khoiTao: khoiTao, hien: hien, an: an };
})();
