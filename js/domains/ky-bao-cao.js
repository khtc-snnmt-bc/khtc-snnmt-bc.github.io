// ============================================================
// bcsnn · js/domains/ky-bao-cao.js
// Vai trò  : Sinh tên tab cho kỳ báo cáo (tháng/quý/năm/đột xuất), URL iframe
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 07:18
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

  return { taoUrlSheet: taoUrlSheet };
})();
