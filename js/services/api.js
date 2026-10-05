// ============================================================
// bcsnn · js/services/api.js
// Vai trò  : Gọi API GAS — file DUY NHẤT chạy fetch
// Lớp      : services — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.2.0 · Cập nhật: 05/10/2026 22:32
// ============================================================
// GAS chuyển hướng 302 → fetch tự theo; Content-Type text/plain tránh
// preflight CORS. Lần gọi đầu ~3–10 s, sau đó ~2 s. Thỉnh thoảng GAS trả
// HTML thay vì JSON → thử lại (so-tay/khoa-ky.md mục K3).

var API = (function () {
  'use strict';

  /**
   * Gửi POST tới GAS, trả Promise<object>.
   * @param {string} action — tên hành động GAS
   * @param {object} duLieu — dữ liệu kèm theo (ngoài action)
   * @returns {Promise<object>}
   */
  function goi(action, duLieu) {
    var url = CAU_HINH.layGasUrl();
    if (!url) return Promise.reject(new Error('Chưa cấu hình URL web app GAS. Vui lòng cài đặt URL GAS trước.'));

    var body = Object.assign({ action: action }, duLieu || {});
    var soLanThu = 0;
    var soLanMax = (CAU_HINH.GAS_THU_LAI || 0) + 1;

    function thuMot() {
      soLanThu++;
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, CAU_HINH.GAS_TIMEOUT || 15000);

      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        signal: controller.signal
      })
        .then(function (res) {
          clearTimeout(timer);
          return res.text();
        })
        .then(function (text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            // GAS trả HTML (lỗi thoảng) → thử lại
            if (soLanThu < soLanMax) return thuMot();
            throw new Error('GAS trả dữ liệu không đọc được (lần ' + soLanThu + ')');
          }
        })
        .catch(function (err) {
          clearTimeout(timer);
          if (err.name === 'AbortError') throw new Error('GAS không phản hồi sau ' + (CAU_HINH.GAS_TIMEOUT / 1000) + ' giây');
          if (soLanThu < soLanMax) return thuMot();
          throw err;
        });
    }

    return thuMot();
  }

  /**
   * Lấy danh sách các đơn vị để hiển thị cho người dùng chọn nhanh.
   * @returns {Promise<object>} { ok, donVi: [{ unitCode, unitName, region, role }] }
   */
  function layDanhSachDonVi() {
    return goi('layDonVi');
  }

  /**
   * Đăng nhập: gửi Gmail + mã đơn vị → GAS kiểm → trả danh sách bảng.
   * @param {string} email
   * @param {string} unitCode
   * @returns {Promise<object>} { ok, tables: [{tableCode, tableName, group, fileId}], unitName, role }
   */
  function dangNhap(email, unitCode) {
    return goi('dangNhap', { email: email, unitCode: unitCode });
  }

  /**
   * Tài khoản được phân công của MỘT đơn vị (GAS không trả toàn bộ một lần).
   * @returns {Promise<object>} { ok, emails: [string] }
   */
  function layTaiKhoan(unitCode) {
    return goi('layTaiKhoan', { unitCode: unitCode });
  }

  /**
   * Đơn vị của một Gmail đã gõ đủ (chỉ khớp chính xác, không liệt kê).
   * @returns {Promise<object>} { ok, donVi: [{ unitCode, unitName }] }
   */
  function timDonViTheoEmail(email) {
    return goi('timDonViTheoEmail', { email: email });
  }

  return {
    goi: goi,
    layDanhSachDonVi: layDanhSachDonVi,
    layTaiKhoan: layTaiKhoan,
    timDonViTheoEmail: timDonViTheoEmail,
    dangNhap: dangNhap
  };
})();
