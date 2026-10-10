// ============================================================
// bcsnn · js/pages/dieu-huong.js
// Vai trò  : Màn hình điều hướng (pptx trang 1): chọn lĩnh vực báo cáo
// Lớp      : pages — được gọi bởi: index2.html (cách đăng nhập cũ) · được phép gọi: utils
// Phiên bản: 0.4.0 · Cập nhật: 10/10/2026 13:50
// ============================================================
// Chỉ còn index2.html dùng (chờ b06h). index.html từ b10 là ô link sang /BTTDC, /Nhiem_Vu, /BC_xa.
// Ô lĩnh vực là nút → callback('bttdc' | 'nhiemvu'); trang không có ô nào thì bỏ qua ô đó.

var PAGE_DIEU_HUONG = (function () {
  'use strict';

  var elTrang;

  function khoiTao(callbackChonLinhVuc) {
    elTrang = DOM.$('#trang-dieu-huong');
    [['#o-linh-vuc-bttdc', 'bttdc'], ['#o-linh-vuc-nhiem-vu', 'nhiemvu']].forEach(function (o) {
      var el = DOM.$(o[0]);
      if (!el) return;
      el.addEventListener('click', function () {
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
