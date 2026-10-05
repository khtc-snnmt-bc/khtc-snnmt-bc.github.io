// ============================================================
// bcsnn · js/domains/ky-bao-cao.js
// Vai trò  : Sinh tên tab cho kỳ báo cáo (tháng/quý/năm/đột xuất), URL iframe
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.1.0 · Cập nhật: 05/10/2026 12:40
// ============================================================

var KY_BAO_CAO = (function () {
  'use strict';

  /**
   * Tạo URL mở file Google Sheet với tham số authuser.
   * @param {string} fileId
   * @param {string} [gmail]
   * @returns {string}
   */
  function taoUrlSheet(fileId, gmail) {
    if (!fileId) return '';
    var base = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(fileId) + '/edit';
    return gmail ? base + '?authuser=' + encodeURIComponent(gmail) : base;
  }

  /**
   * Tạo URL trang đăng nhập Google AccountChooser (mở tab mới).
   * @param {string} gmail
   * @returns {string}
   */
  function taoUrlDangNhapGoogle(gmail) {
    var base = 'https://accounts.google.com/AccountChooser';
    return gmail ? base + '?Email=' + encodeURIComponent(gmail) : base;
  }

  return {
    taoUrlSheet: taoUrlSheet,
    taoUrlDangNhapGoogle: taoUrlDangNhapGoogle
  };
})();
