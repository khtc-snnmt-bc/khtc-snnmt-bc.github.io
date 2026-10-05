// ============================================================
// bcsnn · js/domains/don-vi.js
// Vai trò  : Nghiệp vụ thuần về đơn vị: lọc theo từ khoá, sắp xếp
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.2.0 · Cập nhật: 05/10/2026 22:32
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

  /**
   * Tìm đơn vị khớp CHÍNH XÁC tên hoặc mã (không phân biệt hoa thường, dấu).
   * @returns {object|null}
   */
  function timChinhXac(danhSach, chu) {
    var c = BO_DAU.boDau(chu || '');
    if (!c) return null;
    for (var i = 0; i < danhSach.length; i++) {
      var dv = danhSach[i];
      if (BO_DAU.boDau(dv.unitName || '') === c || BO_DAU.boDau(dv.unitCode || '') === c) return dv;
    }
    return null;
  }

  /**
   * Chia nhóm hiển thị cột chọn nhanh: Quản trị trước, rồi Đơn vị báo cáo.
   * @returns {Array<{ten: string, ds: Array}>} — bỏ nhóm rỗng
   */
  function nhomTheoVaiTro(danhSach) {
    var laQuanTri = function (dv) { return dv.role === 'Quản trị' || dv.role === 'Quản lý báo cáo'; };
    var quanTri = danhSach.filter(laQuanTri);
    var baoCao = danhSach.filter(function (dv) { return !laQuanTri(dv); });
    return [
      { ten: 'Quản trị', ds: quanTri },
      { ten: 'Đơn vị báo cáo', ds: baoCao }
    ].filter(function (n) { return n.ds.length; });
  }

  return {
    locDonVi: locDonVi,
    sapXepDonVi: sapXepDonVi,
    timChinhXac: timChinhXac,
    nhomTheoVaiTro: nhomTheoVaiTro
  };
})();
