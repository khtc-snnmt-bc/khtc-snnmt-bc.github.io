// ============================================================
// bcsnn · js/domains/ky-bao-cao.js
// Vai trò  : Sinh tên tab cho kỳ báo cáo (tháng/quý/năm/đột xuất), URL iframe, file của bảng
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.3.0 · Cập nhật: 06/10/2026 20:54
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
   * Các file xem được của một bảng ở sidebar: bảng thường → file của mình;
   * bảng mình quản lý → Bảng tổng (nếu có) rồi từng đơn vị.
   * @returns {Array<{fileId: string, nhan: string}>}
   */
  function dsFileBang(bang) {
    if (!bang.donVi) return bang.fileId ? [{ fileId: bang.fileId, nhan: bang.tableName || bang.tableCode }] : [];
    var ds = bang.fileId ? [{ fileId: bang.fileId, nhan: 'Bảng tổng' }] : [];
    return ds.concat(bang.donVi.map(function (d) { return { fileId: d.fileId, nhan: d.unitName || d.unitCode }; }));
  }

  return { taoUrlSheet: taoUrlSheet, dsFileBang: dsFileBang };
})();
