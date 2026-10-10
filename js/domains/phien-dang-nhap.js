// ============================================================
// bcsnn · js/domains/phien-dang-nhap.js
// Vai trò  : Nghiệp vụ thuần: phiên đăng nhập + phiên quản trị (sessionStorage), đơn vị gần đây,
//            vé nhớ đăng nhập (localStorage), lĩnh vực đang vào
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.7.0 · Cập nhật: 10/10/2026 16:10
// ============================================================
// Phiên giữ tới khi đóng tab (sessionStorage). localStorage giữ mã đơn vị gần
// đây, vài Gmail đăng nhập gần đây (để gợi ý) và vé nhớ đăng nhập của cách
// Google — không lưu mật khẩu. Lĩnh vực độc lập (b10b): phiên, vé, đơn vị gần đây,
// phiên quản trị cất riêng theo lĩnh vực đang vào (khoá + '_' + thư mục lĩnh vực);
// Gmail gần đây dùng chung (là của người dùng, không của lĩnh vực).

var PHIEN = (function () {
  'use strict';

  var KHOA = 'bcsnn_phien';

  /** Hàm thuần: tên khoá lưu riêng của lĩnh vực ('' = khoá chung) */
  function khoaTheoLinhVuc(ten, thuMuc) {
    return thuMuc ? ten + '_' + thuMuc : ten;
  }

  function khoa(ten) {
    return khoaTheoLinhVuc(ten, docLinhVuc());
  }

  /** Lưu kết quả đăng nhập vào sessionStorage */
  function luu(duLieu) {
    try {
      sessionStorage.setItem(khoa(KHOA), JSON.stringify(duLieu));
    } catch (e) { /* private mode */ }
  }

  /** Đọc phiên hiện tại — null nếu chưa đăng nhập */
  function doc() {
    try {
      var raw = sessionStorage.getItem(khoa(KHOA));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /** Xoá phiên (đăng xuất) — xoá luôn vé nhớ đăng nhập */
  function xoa() {
    try { sessionStorage.removeItem(khoa(KHOA)); } catch (e) { /* ok */ }
    try { localStorage.removeItem(khoa(KHOA_NHO)); } catch (e) { /* ok */ }
  }

  // ---------- Nhớ đăng nhập (chỉ cách Google — index.html) ----------
  // Vé do GAS ký, không hạn; mở lại trang là vào thẳng. Đăng xuất thì xoá.

  var KHOA_NHO = 'bcsnn_nho';

  function luuNho(phien, ve) {
    try { localStorage.setItem(khoa(KHOA_NHO), JSON.stringify({ ve: ve, phien: phien })); } catch (e) { /* riêng tư: bỏ qua */ }
  }

  /** @returns {{ve: string, phien: object}|null} */
  function docNho() {
    try {
      var nho = JSON.parse(localStorage.getItem(khoa(KHOA_NHO)) || 'null');
      return nho && nho.ve && nho.phien && nho.phien.email ? nho : null;
    } catch (e) { return null; }
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
      var ds = JSON.parse(localStorage.getItem(khoa(KHOA_GAN_DAY)) || '[]');
      return Array.isArray(ds) ? ds : [];
    } catch (e) { return []; }
  }

  function ghiGanDay(ma) {
    try {
      localStorage.setItem(khoa(KHOA_GAN_DAY), JSON.stringify(themGanDay(docGanDay(), ma)));
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

  // ---------- Lĩnh vực đang vào (trang quản trị quay về đúng địa chỉ lĩnh vực) ----------

  var KHOA_LINH_VUC = 'bcsnn_linh_vuc';

  function luuLinhVuc(thuMuc) {
    try { sessionStorage.setItem(KHOA_LINH_VUC, thuMuc); } catch (e) { /* private mode */ }
  }

  /** Thư mục web của lĩnh vực vào gần nhất trong tab này ('' nếu chưa có) */
  function docLinhVuc() {
    try { return sessionStorage.getItem(KHOA_LINH_VUC) || ''; } catch (e) { return ''; }
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
      sessionStorage.setItem(khoa(KHOA_QUAN_TRI), JSON.stringify({ token: token, hetHan: bayGio + hetHanSauGiay * 1000 }));
    } catch (e) { /* private mode */ }
  }

  function docQuanTri() {
    try {
      var raw = sessionStorage.getItem(khoa(KHOA_QUAN_TRI));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function xoaQuanTri() {
    try { sessionStorage.removeItem(khoa(KHOA_QUAN_TRI)); } catch (e) { /* ok */ }
  }

  return {
    khoaTheoLinhVuc: khoaTheoLinhVuc, luu: luu, doc: doc, xoa: xoa, luuNho: luuNho, docNho: docNho, themGanDay: themGanDay, docGanDay: docGanDay, ghiGanDay: ghiGanDay,
    docEmailGanDay: docEmailGanDay, ghiEmailGanDay: ghiEmailGanDay, luuLinhVuc: luuLinhVuc, docLinhVuc: docLinhVuc,
    laQuanTri: laQuanTri, conHanQuanTri: conHanQuanTri, luuQuanTri: luuQuanTri, docQuanTri: docQuanTri, xoaQuanTri: xoaQuanTri
  };
})();
