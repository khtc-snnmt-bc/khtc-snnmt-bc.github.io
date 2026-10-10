// ============================================================
// bcsnn · js/pages/dieu-huong.js
// Vai trò  : Màn hình điều hướng (pptx trang 1): chọn lĩnh vực báo cáo
// Lớp      : pages — được gọi bởi: app (index.html) · được phép gọi: utils
// Phiên bản: 0.3.0 · Cập nhật: 10/10/2026 12:55
// ============================================================
// Hai ô lĩnh vực (Bồi thường; Nhiệm vụ UBND TP và Sở) là nút → callback('bttdc' | 'nhiemvu').
// Ô "Báo cáo định kỳ…" là link thường (<a href>) sang app khác — không cần JS.
// Ô chưa làm chỉ là chữ, không gắn sự kiện.

var PAGE_DIEU_HUONG = (function () {
  'use strict';

  var elTrang;

  function khoiTao(callbackChonLinhVuc) {
    elTrang = DOM.$('#trang-dieu-huong');
    [['#o-linh-vuc-bttdc', 'bttdc'], ['#o-linh-vuc-nhiem-vu', 'nhiemvu']].forEach(function (o) {
      DOM.$(o[0]).addEventListener('click', function () {
        an();
        if (typeof callbackChonLinhVuc === 'function') callbackChonLinhVuc(o[1]);
      });
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
