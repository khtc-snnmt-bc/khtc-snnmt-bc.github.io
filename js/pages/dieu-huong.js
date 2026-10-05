// ============================================================
// bcsnn · js/pages/dieu-huong.js
// Vai trò  : Màn hình điều hướng (pptx trang 1): chọn lĩnh vực báo cáo
// Lớp      : pages — được gọi bởi: app (index.html) · được phép gọi: utils, dom
// Phiên bản: 0.1.0 · Cập nhật: 05/10/2026 14:55
// ============================================================

var PAGE_DIEU_HUONG = (function () {
  'use strict';

  var elTrang, onChonLinhVucCallback;

  function khoiTao(callbackChonLinhVuc) {
    onChonLinhVucCallback = callbackChonLinhVuc;
    elTrang = DOM.$('#trang-dieu-huong');

    var btnBttdc = DOM.$('#card-linh-vuc-bttdc');
    if (btnBttdc) {
      btnBttdc.addEventListener('click', function (e) {
        e.preventDefault();
        an();
        if (typeof onChonLinhVucCallback === 'function') {
          onChonLinhVucCallback('bttdc');
        }
      });
    }

    var cacTheKhac = DOM.$$('.card-linh-vuc:not(#card-linh-vuc-bttdc)');
    cacTheKhac.forEach(function (card) {
      card.addEventListener('click', function () {
        alert('Lĩnh vực này đang được xây dựng. Vui lòng chọn "Công tác bồi thường giải phóng mặt bằng".');
      });
    });
  }

  function hien() {
    DOM.hien(elTrang);
  }

  function an() {
    DOM.an(elTrang);
  }

  return {
    khoiTao: khoiTao,
    hien: hien,
    an: an
  };
})();
