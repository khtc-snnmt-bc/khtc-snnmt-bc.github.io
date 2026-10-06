// ============================================================
// bcsnn · js/domains/phien-dang-nhap.js
// Vai trò  : Nghiệp vụ thuần: phiên đăng nhập (sessionStorage) + đơn vị truy cập gần đây
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 07:18
// ============================================================
// Phiên chỉ giữ tới khi đóng tab (sessionStorage — người dùng có thể đăng nhập
// Gmail khác ở tab khác). Chỉ danh sách đơn vị gần đây dùng localStorage, và
// chỉ lưu mã đơn vị, không lưu Gmail.

var PHIEN = (function () {
  'use strict';

  var KHOA = 'bcsnn_phien';

  /** Lưu kết quả đăng nhập vào sessionStorage */
  function luu(duLieu) {
    try {
      sessionStorage.setItem(KHOA, JSON.stringify(duLieu));
    } catch (e) { /* private mode */ }
  }

  /** Đọc phiên hiện tại — null nếu chưa đăng nhập */
  function doc() {
    try {
      var raw = sessionStorage.getItem(KHOA);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /** Xoá phiên (đăng xuất) */
  function xoa() {
    try { sessionStorage.removeItem(KHOA); } catch (e) { /* ok */ }
  }

  // ---------- Đơn vị truy cập gần đây (theo từng trình duyệt, chỉ lưu mã đơn vị) ----------

  var KHOA_GAN_DAY = 'bcsnn_gan_day';
  var TOI_DA_GAN_DAY = 2; // vừa đủ một hàng 2 cột ở cột chọn nhanh

  /** Hàm thuần: đưa mã vừa dùng lên đầu, bỏ trùng, giữ tối đa TOI_DA_GAN_DAY */
  function themGanDay(danhSach, ma) {
    var kq = [ma].concat((danhSach || []).filter(function (m) { return m !== ma; }));
    return kq.slice(0, TOI_DA_GAN_DAY);
  }

  function docGanDay() {
    try {
      var ds = JSON.parse(localStorage.getItem(KHOA_GAN_DAY) || '[]');
      return Array.isArray(ds) ? ds : [];
    } catch (e) { return []; }
  }

  function ghiGanDay(ma) {
    try {
      localStorage.setItem(KHOA_GAN_DAY, JSON.stringify(themGanDay(docGanDay(), ma)));
    } catch (e) { /* chế độ riêng tư: bỏ qua */ }
  }

  return { luu: luu, doc: doc, xoa: xoa, themGanDay: themGanDay, docGanDay: docGanDay, ghiGanDay: ghiGanDay };
})();
