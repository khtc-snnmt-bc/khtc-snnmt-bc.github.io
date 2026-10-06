// ============================================================
// bcsnn · js/services/api.js
// Vai trò  : Gọi API GAS — file DUY NHẤT chạy fetch; xin mã Google (thư viện GIS)
// Lớp      : services — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.5.0 · Cập nhật: 06/10/2026 20:11
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
   * Mở cửa sổ Google để người dùng chứng minh là chủ Gmail → access token.
   * PHẢI gọi ngay trong sự kiện bấm nút (không chờ gì trước), kẻo trình duyệt chặn cửa sổ.
   * @param {string} goiY — Gmail đã gõ (Google điền sẵn), có thể trống
   * @returns {Promise<string>}
   */
  function layMaGoogle(goiY) {
    return new Promise(function (resolve, reject) {
      var g = window.google;
      if (!g || !g.accounts || !g.accounts.oauth2) {
        reject(new Error('Chưa tải xong phần đăng nhập Google. Vui lòng tải lại trang.'));
        return;
      }
      g.accounts.oauth2.initTokenClient({
        client_id: CAU_HINH.GOOGLE_CLIENT_ID,
        scope: 'openid email',
        hint: goiY || '',
        prompt: goiY ? '' : 'select_account', // chưa gõ Gmail → luôn cho chọn tài khoản
        callback: function (res) {
          if (res && res.access_token) resolve(res.access_token);
          else reject(new Error('Google chưa xác nhận tài khoản. Vui lòng thử lại.'));
        },
        error_callback: function (err) {
          var dong = err && (err.type === 'popup_closed' || err.type === 'popup_failed_to_open');
          reject(new Error(dong
            ? 'Cửa sổ đăng nhập Google đã đóng hoặc bị chặn. Vui lòng bấm Đăng nhập lại.'
            : 'Không đăng nhập được Google. Vui lòng thử lại.'));
        }
      }).requestAccessToken();
    });
  }

  /**
   * Đăng nhập cách mới: GAS lấy Gmail từ mã Google, không tin Gmail gửi lên.
   * @returns {Promise<object>} như dangNhap, kèm email đã xác minh
   */
  function dangNhapGoogle(accessToken, unitCode) {
    return goi('dangNhapGoogle', { accessToken: accessToken, unitCode: unitCode });
  }

  /** Mở lại bằng vé nhớ đăng nhập → như dangNhap. */
  function dangNhapVe(ve, unitCode) {
    return goi('dangNhapVe', { ve: ve, unitCode: unitCode });
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

  /**
   * Đăng nhập quản trị: tài khoản vai trò Quản trị + mật khẩu quản trị.
   * @returns {Promise<object>} { ok, token, hetHanSau (giây) } | { ok:false, loi }
   */
  function quanTriDangNhap(email, unitCode, matKhau) {
    return goi('quanTriDangNhap', { email: email, unitCode: unitCode, matKhau: matKhau });
  }

  /** Huỷ phiên quản trị trên máy chủ. */
  function quanTriDangXuat(token) {
    return goi('quanTriDangXuat', { token: token });
  }

  return {
    goi: goi,
    layDanhSachDonVi: layDanhSachDonVi,
    layTaiKhoan: layTaiKhoan,
    timDonViTheoEmail: timDonViTheoEmail,
    dangNhap: dangNhap,
    layMaGoogle: layMaGoogle,
    dangNhapGoogle: dangNhapGoogle,
    dangNhapVe: dangNhapVe,
    quanTriDangNhap: quanTriDangNhap,
    quanTriDangXuat: quanTriDangXuat
  };
})();
