// ============================================================
// bcsnn · js/domains/phien-dang-nhap.js
// Vai trò  : Nghiệp vụ thuần: phiên đăng nhập + phiên quản trị (sessionStorage), đơn vị gần đây
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.4.0 · Cập nhật: 06/10/2026 13:50
// ============================================================
// Phiên chỉ giữ tới khi đóng tab (sessionStorage — người dùng có thể đăng nhập
// Gmail khác ở tab khác). localStorage chỉ giữ mã đơn vị gần đây và vài Gmail
// đăng nhập gần đây (để gợi ý, theo từng trình duyệt) — không lưu mật khẩu.

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
  function themGanDay(danhSach, ma, toiDa) {
    var kq = [ma].concat((danhSach || []).filter(function (m) { return m !== ma; }));
    return kq.slice(0, toiDa || TOI_DA_GAN_DAY);
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

  // ---------- Gmail đăng nhập gần đây (gợi ý ở ô Người nhập) ----------

  var KHOA_EMAIL = 'bcsnn_email_gan_day';
  var TOI_DA_EMAIL = 5;

  function docEmailGanDay() {
    try {
      var ds = JSON.parse(localStorage.getItem(KHOA_EMAIL) || '[]');
      return Array.isArray(ds) ? ds : [];
    } catch (e) { return []; }
  }

  function ghiEmailGanDay(email) {
    try {
      localStorage.setItem(KHOA_EMAIL, JSON.stringify(themGanDay(docEmailGanDay(), email, TOI_DA_EMAIL)));
    } catch (e) { /* chế độ riêng tư: bỏ qua */ }
  }

  // ---------- Quản trị ----------

  var VAI_TRO_QUAN_TRI = 'Quản trị';
  var KHOA_QUAN_TRI = 'bcsnn_quan_tri';

  /** Hàm thuần: phiên nhập liệu có vai trò Quản trị không */
  function laQuanTri(phien) {
    return !!(phien && phien.role === VAI_TRO_QUAN_TRI);
  }

  /** Hàm thuần: phiên quản trị còn hạn tại thời điểm bayGio (ms) không */
  function conHanQuanTri(pq, bayGio) {
    return !!(pq && pq.token && pq.hetHan > bayGio);
  }

  /** Lưu mã phiên quản trị GAS trả về; hết hạn tính theo đồng hồ trình duyệt */
  function luuQuanTri(token, hetHanSauGiay, bayGio) {
    try {
      sessionStorage.setItem(KHOA_QUAN_TRI, JSON.stringify({ token: token, hetHan: bayGio + hetHanSauGiay * 1000 }));
    } catch (e) { /* private mode */ }
  }

  function docQuanTri() {
    try {
      var raw = sessionStorage.getItem(KHOA_QUAN_TRI);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function xoaQuanTri() {
    try { sessionStorage.removeItem(KHOA_QUAN_TRI); } catch (e) { /* ok */ }
  }

  return {
    luu: luu, doc: doc, xoa: xoa, themGanDay: themGanDay, docGanDay: docGanDay, ghiGanDay: ghiGanDay,
    docEmailGanDay: docEmailGanDay, ghiEmailGanDay: ghiEmailGanDay,
    laQuanTri: laQuanTri, conHanQuanTri: conHanQuanTri, luuQuanTri: luuQuanTri, docQuanTri: docQuanTri, xoaQuanTri: xoaQuanTri
  };
})();
