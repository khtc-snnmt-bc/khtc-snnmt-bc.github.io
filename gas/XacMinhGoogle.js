// ============================================================
// bcsnn · gas/XacMinhGoogle.js
// Vai trò  : Xác minh mã Google → Gmail đã xác thực
//            · ID token (nút Google vẽ sẵn — trang thử b06x)
//            · access token (nút "Đăng nhập" của app — index.html, b06g)
// Lớp      : gas backend — hàm thuần kiemMaGoogle_, kiemMaTruyCap_ + hàm gọi Google
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 19:26
// ============================================================
// Client ID là mã công khai (không phải bí mật).

var GOOGLE_CLIENT_ID_ = '237899473140-bqtoitjtpstbv9hu0j0jsdljfnn4hpv2.apps.googleusercontent.com';

/**
 * Hàm thuần: thông tin Google trả về cho mã có hợp lệ không.
 * @param {object} info - kết quả của oauth2.googleapis.com/tokeninfo
 * @param {string} clientId - Client ID của app
 * @param {number} bayGioGiay - giờ hiện tại (giây, UTC)
 * @returns {{ok: boolean, email?: string, loi?: string}}
 */
function kiemMaGoogle_(info, clientId, bayGioGiay) {
  if (!info || !info.email) return { ok: false, loi: 'Mã Google không hợp lệ.' };
  if (info.aud !== clientId) return { ok: false, loi: 'Mã Google không dành cho ứng dụng này.' };
  if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') {
    return { ok: false, loi: 'Mã Google không đến từ Google.' };
  }
  if (String(info.email_verified) !== 'true') return { ok: false, loi: 'Gmail chưa được Google xác minh.' };
  if (Number(info.exp) <= bayGioGiay) return { ok: false, loi: 'Mã Google đã hết hạn, hãy đăng nhập lại.' };
  return { ok: true, email: String(info.email).toLowerCase().trim() };
}

/** Hỏi Google về mã rồi kiểm. Lỗi mạng / mã sai đều trả { ok:false }. */
function xuLyXacMinhGoogle_(idToken) {
  if (!idToken) return { ok: false, loi: 'Thiếu mã Google.' };
  try {
    var res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return { ok: false, loi: 'Google không nhận mã này.' };
    return kiemMaGoogle_(JSON.parse(res.getContentText()), GOOGLE_CLIENT_ID_, Math.floor(Date.now() / 1000));
  } catch (err) {
    return { ok: false, loi: 'Lỗi xác minh Google: ' + String(err) };
  }
}

/**
 * Hàm thuần: access token có phải của app này, Gmail đã xác minh, còn hạn không.
 * Phải kiểm aud — kẻo mã xin từ app khác (cùng Gmail) được đem sang dùng.
 * @param {object} info - kết quả của oauth2.googleapis.com/tokeninfo?access_token=
 * @returns {{ok: boolean, email?: string, loi?: string}}
 */
function kiemMaTruyCap_(info, clientId) {
  if (!info || !info.email) return { ok: false, loi: 'Mã Google không hợp lệ.' };
  if (info.aud !== clientId) return { ok: false, loi: 'Mã Google không dành cho ứng dụng này.' };
  if (String(info.email_verified) !== 'true') return { ok: false, loi: 'Gmail chưa được Google xác minh.' };
  if (!(Number(info.expires_in) > 0)) return { ok: false, loi: 'Mã Google đã hết hạn, hãy đăng nhập lại.' };
  return { ok: true, email: String(info.email).toLowerCase().trim() };
}

/** Hỏi Google về access token rồi kiểm. Lỗi mạng / mã sai đều trả { ok:false }. */
function xacMinhMaTruyCap_(accessToken) {
  if (!accessToken) return { ok: false, loi: 'Thiếu mã Google.' };
  try {
    var res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(accessToken),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return { ok: false, loi: 'Google không nhận mã này, hãy đăng nhập lại.' };
    return kiemMaTruyCap_(JSON.parse(res.getContentText()), GOOGLE_CLIENT_ID_);
  } catch (err) {
    return { ok: false, loi: 'Lỗi xác minh Google: ' + String(err) };
  }
}

/** Chạy MỘT LẦN trong trình soạn Apps Script để cấp quyền gọi ra ngoài (UrlFetchApp). */
function capQuyenGoiNgoai() {
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=x', { muteHttpExceptions: true });
}
