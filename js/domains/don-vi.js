// ============================================================
// bcsnn · js/domains/don-vi.js
// Vai trò  : Nghiệp vụ thuần về đơn vị: lọc theo từ khoá, sắp xếp
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.1.0 · Cập nhật: 05/10/2026 12:40
// ============================================================

var DON_VI = (function () {
  'use strict';

  /**
   * Lọc danh sách đơn vị theo từ khoá tìm kiếm (hỗ trợ tiếng Việt không dấu).
   * @param {Array<{unitCode: string, unitName: string}>} danhSach
   * @param {string} tuKhoa
   * @returns {Array<{unitCode: string, unitName: string}>}
   */
  function locDonVi(danhSach, tuKhoa) {
    if (!danhSach || !danhSach.length) return [];
    if (!tuKhoa || !tuKhoa.trim()) return danhSach.slice();

    var tk = tuKhoa.trim();
    return danhSach.filter(function (dv) {
      return BO_DAU.khop(dv.unitName || '', tk) ||
             BO_DAU.khop(dv.unitCode || '', tk);
    });
  }

  /**
   * Sắp xếp danh sách đơn vị theo tên hiển thị (tiếng Việt).
   * @param {Array<{unitCode: string, unitName: string}>} danhSach
   * @returns {Array<{unitCode: string, unitName: string}>}
   */
  function sapXepDonVi(danhSach) {
    return danhSach.slice().sort(function (a, b) {
      return (a.unitName || '').localeCompare(b.unitName || '', 'vi');
    });
  }

  return {
    locDonVi: locDonVi,
    sapXepDonVi: sapXepDonVi
  };
})();
