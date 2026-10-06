// ============================================================
// bcsnn · gas/VeDangNhap.js
// Vai trò  : "Vé" nhớ đăng nhập — cấp sau khi Google xác minh, lần sau vào thẳng
// Lớp      : gas — gọi bởi: DangNhap.js · gọi: QuanTri.js (soSanhDeu_, byteSangHex_)
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 20:11
// ============================================================
// Vé = "gmail|chữ ký", chữ ký = HMAC-SHA256(gmail) bằng khoá bí mật VE_BI_MAT
// (Script Properties, tự sinh lần đầu). Vé không hạn (chủ dự án chốt 06/10/2026);
// trình duyệt xoá vé khi Đăng xuất. Gỡ Gmail khỏi tab Tài khoản → vé hết tác dụng.
// Muốn huỷ MỌI vé đã cấp: xoá thuộc tính VE_BI_MAT trong Cài đặt dự án.

// ---------- Hàm thuần (kiểm bằng Node: kiem-thu/kiem-gas-ve.mjs) ----------

/** @param {function(string): string} kyTen — chữ ký hex của chuỗi (tiêm vào để kiểm bằng Node) */
function taoVe_(email, kyTen) {
  var em = String(email || '').toLowerCase().trim();
  return em + '|' + kyTen(em);
}

/** Vé đúng chữ ký → Gmail; sai / hỏng → null. */
function docVe_(ve, kyTen) {
  var s = String(ve || '');
  var i = s.lastIndexOf('|');
  if (i < 1) return null;
  var em = s.slice(0, i);
  return soSanhDeu_(s.slice(i + 1), kyTen(em)) ? em : null;
}

// ---------- Chạm Script Properties ----------

function layBiMatVe_() {
  var p = PropertiesService.getScriptProperties();
  var biMat = p.getProperty('VE_BI_MAT');
  if (biMat) return biMat;
  var khoa = LockService.getScriptLock();
  khoa.waitLock(10000); // hai yêu cầu đầu tiên cùng lúc không sinh hai khoá khác nhau
  try {
    biMat = p.getProperty('VE_BI_MAT');
    if (!biMat) {
      biMat = maNgauNhien_() + maNgauNhien_();
      p.setProperty('VE_BI_MAT', biMat);
    }
    return biMat;
  } finally {
    khoa.releaseLock();
  }
}

function kyTenVe_(email) {
  return byteSangHex_(Utilities.computeHmacSha256Signature(email, layBiMatVe_(), Utilities.Charset.UTF_8));
}
