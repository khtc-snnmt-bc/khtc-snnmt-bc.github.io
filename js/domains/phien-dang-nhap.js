// ============================================================
// bcsnn · js/domains/phien-dang-nhap.js
// Vai trò  : Nghiệp vụ thuần: lưu / đọc phiên đăng nhập trong sessionStorage
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.1.0 · Cập nhật: 05/10/2026 12:25
// ============================================================
// Phiên chỉ giữ tới khi đóng tab — không dùng localStorage (người dùng
// có thể đăng nhập Gmail khác ở tab khác, sessionStorage giữ riêng).

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

  return { luu: luu, doc: doc, xoa: xoa };
})();
