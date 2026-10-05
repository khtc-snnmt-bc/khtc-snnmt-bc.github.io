// ============================================================
// bcsnn · js/utils/bo-dau.js
// Vai trò  : Bỏ dấu tiếng Việt — dùng để lọc nhanh danh sách đơn vị
// Lớp      : utils — được gọi bởi: domains, pages · được phép gọi: (không ai)
// Phiên bản: 0.1.0 · Cập nhật: 05/10/2026 12:25
// ============================================================

var BO_DAU = (function () {
  'use strict';

  /**
   * Bỏ dấu tiếng Việt, chuyển thường, bỏ khoảng trắng thừa.
   * 'Ban Quản Lý Dự Án' → 'ban quan ly du an'
   */
  function boDau(chuoi) {
    return String(chuoi)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Kiểm chuỗi nguồn (đã bỏ dấu) có chứa từ khoá (đã bỏ dấu) không */
  function khop(nguon, tuKhoa) {
    return boDau(nguon).indexOf(boDau(tuKhoa)) >= 0;
  }

  return { boDau: boDau, khop: khop };
})();
