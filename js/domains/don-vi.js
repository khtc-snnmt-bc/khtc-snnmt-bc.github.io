// ============================================================
// bcsnn · js/domains/don-vi.js
// Vai trò  : Nghiệp vụ thuần về đơn vị: lọc theo từ khoá, sắp xếp
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.3.0 · Cập nhật: 06/10/2026 07:18
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
   * Tách cột chọn nhanh: các đơn vị truy cập gần đây (theo thứ tự gần nhất
   * trước) và phần còn lại (giữ nguyên thứ tự đã sắp abc của danh sách vào).
   * @param {Array} danhSach — đã lọc + sắp abc
   * @param {Array<string>} maGanDay
   * @returns {{ganDay: Array, conLai: Array}}
   */
  function tachGanDay(danhSach, maGanDay) {
    var ganDay = [];
    (maGanDay || []).forEach(function (ma) {
      var dv = danhSach.filter(function (d) { return d.unitCode === ma; })[0];
      if (dv) ganDay.push(dv);
    });
    var conLai = danhSach.filter(function (d) { return ganDay.indexOf(d) < 0; });
    return { ganDay: ganDay, conLai: conLai };
  }

  return {
    locDonVi: locDonVi,
    sapXepDonVi: sapXepDonVi,
    timChinhXac: timChinhXac,
    tachGanDay: tachGanDay
  };
})();
