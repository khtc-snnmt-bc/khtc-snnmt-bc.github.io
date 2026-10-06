// ============================================================
// bcsnn · gas/QuanTri.js
// Vai trò  : Mật khẩu quản trị (băm SHA-256 + muối) và phiên quản trị
// Lớp      : gas — gọi bởi: Code.js · gọi: DangNhap.js (kiemTraTaiKhoan_)
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 12:55
// ============================================================
// Một mật khẩu chung cho mọi tài khoản vai trò "Quản trị" (KIEN-TRUC.md mục 4).
// Script Properties: QT_MUOI, QT_BAM (băm), QT_DOT (đổi mật khẩu → phiên cũ hết).
// Không bao giờ lưu mật khẩu gốc. Đặt / đổi mật khẩu: ghi tạm thuộc tính
// QT_MAT_KHAU_MOI trong Cài đặt dự án rồi chạy tay datMatKhauQuanTri().
// Phiên = mã ngẫu nhiên trong CacheService, sống QT_PHIEN_GIAY.
// Sai QT_SAI_TOI_DA lần liền → khoá Gmail đó QT_KHOA_GIAY.

var VAI_TRO_QUAN_TRI = 'Quản trị';
var QT_SO_VONG = 1000;
var QT_PHIEN_GIAY = 21600;   // 6 giờ — mức tối đa của CacheService
var QT_SAI_TOI_DA = 5;
var QT_KHOA_GIAY = 900;      // 15 phút
var QT_DO_DAI_TOI_THIEU = 8;

// ---------- Hàm thuần (kiểm bằng Node: kiem-thu/kiem-gas-quan-tri.mjs) ----------

/** Mảng byte có dấu (−128..127, kiểu Apps Script) → chuỗi hex. */
function byteSangHex_(bytes) {
  var kq = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    kq += (b < 16 ? '0' : '') + b.toString(16);
  }
  return kq;
}

/**
 * Băm lặp: h = bam(muối + mật khẩu), rồi soVong − 1 lần h = bam(muối + h).
 * @param {function(string): string} bam — SHA-256 trả hex (tiêm vào để kiểm bằng Node)
 */
function bamMatKhau_(muoi, matKhau, soVong, bam) {
  var h = bam(muoi + String(matKhau));
  for (var i = 1; i < soVong; i++) h = bam(muoi + h);
  return h;
}

/** Bỏ khoảng trắng hai đầu, gộp dấu tiếng Việt về một dạng (NFC) — dán/gõ khác nhau vẫn khớp. */
function chuanHoaMatKhau_(matKhau) {
  return String(matKhau || '').normalize('NFC').trim();
}

/** So hai chuỗi không dừng sớm — tránh đoán dần qua thời gian trả lời. */
function soSanhDeu_(a, b) {
  a = String(a); b = String(b);
  var khac = a.length ^ b.length;
  for (var i = 0; i < a.length; i++) khac |= a.charCodeAt(i) ^ b.charCodeAt(i % (b.length || 1));
  return khac === 0;
}

/** Gmail + đơn vị có trong tab Tài khoản với vai trò Quản trị không. */
function laTaiKhoanQuanTri_(dsTaiKhoan, email, unitCode) {
  var kq = kiemTraTaiKhoan_(dsTaiKhoan, email, unitCode);
  return kq.hopLe && kq.role === VAI_TRO_QUAN_TRI;
}

/** Phiên đọc từ cache còn hợp lệ không (đợt mật khẩu phải trùng). */
function phienHopLe_(phien, dotHienTai) {
  return !!(phien && phien.email && String(phien.dot) === String(dotHienTai));
}

// ---------- Chạm Script Properties / Cache ----------

function bamSha256_(chuoi) {
  return byteSangHex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, chuoi, Utilities.Charset.UTF_8));
}

function maNgauNhien_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

/** CHẠY TAY trong trình soạn Apps Script để đặt / đổi mật khẩu quản trị. */
function datMatKhauQuanTri() {
  var p = PropertiesService.getScriptProperties();
  // Tên gõ tay có thể dính khoảng trắng / chữ thường → so sau khi chuẩn hoá
  var khoa = p.getKeys().filter(function (k) { return k.trim().toUpperCase() === 'QT_MAT_KHAU_MOI'; })[0];
  if (!khoa) throw new Error('Chưa có thuộc tính QT_MAT_KHAU_MOI (đã bấm Lưu chưa?). Đang có: ' + p.getKeys().join(', '));
  var moi = chuanHoaMatKhau_(p.getProperty(khoa));
  p.deleteProperty(khoa);
  if (!moi) throw new Error('Giá trị QT_MAT_KHAU_MOI đang trống — đã xoá, hãy ghi lại');
  if (moi.length < QT_DO_DAI_TOI_THIEU) {
    throw new Error('Mật khẩu phải dài ít nhất ' + QT_DO_DAI_TOI_THIEU + ' ký tự — đã xoá, hãy ghi lại');
  }
  var muoi = maNgauNhien_();
  p.setProperties({ QT_MUOI: muoi, QT_BAM: bamMatKhau_(muoi, moi, QT_SO_VONG, bamSha256_), QT_DOT: String(Date.now()) });
  Logger.log('Đã đặt mật khẩu quản trị. Thuộc tính QT_MAT_KHAU_MOI đã được xoá.');
}

function xuLyQuanTriDangNhap_(quanLyId, email, unitCode, matKhau) {
  if (!quanLyId) return { ok: false, loi: 'Chưa cấu hình Sheet quản lý' };
  var em = String(email || '').toLowerCase().trim();
  var cache = CacheService.getScriptCache();
  var p = PropertiesService.getScriptProperties();
  var khoaSai = 'qt_sai_' + p.getProperty('QT_DOT') + '_' + em; // đặt lại mật khẩu → bộ đếm mới
  var soSai = Number(cache.get(khoaSai) || 0);
  if (soSai >= QT_SAI_TOI_DA) return { ok: false, loi: 'Nhập sai quá nhiều lần. Thử lại sau 15 phút.' };

  try {
    var ss = SpreadsheetApp.openById(quanLyId);
    if (!laTaiKhoanQuanTri_(docTabQuanLy_(ss, 'Tài khoản'), em, unitCode)) {
      return { ok: false, loi: 'Tài khoản không có quyền quản trị.' };
    }
  } catch (err) {
    return { ok: false, loi: 'Lỗi đọc tài khoản: ' + String(err) };
  }

  var muoi = p.getProperty('QT_MUOI');
  var bamLuu = p.getProperty('QT_BAM');
  if (!muoi || !bamLuu) return { ok: false, loi: 'Chưa đặt mật khẩu quản trị.' };

  if (!soSanhDeu_(bamMatKhau_(muoi, chuanHoaMatKhau_(matKhau), QT_SO_VONG, bamSha256_), bamLuu)) {
    cache.put(khoaSai, String(soSai + 1), QT_KHOA_GIAY);
    return { ok: false, loi: 'Mật khẩu không đúng.' };
  }

  cache.remove(khoaSai);
  var token = maNgauNhien_();
  var phien = { email: em, unitCode: String(unitCode).trim(), dot: p.getProperty('QT_DOT') };
  cache.put('qt_phien_' + token, JSON.stringify(phien), QT_PHIEN_GIAY);
  return { ok: true, token: token, hetHanSau: QT_PHIEN_GIAY };
}

/** Phiên quản trị của token, null nếu hết hạn / sai. Mọi việc quản trị gọi hàm này trước. */
function docPhienQuanTri_(token) {
  if (!token || !/^[0-9a-f]{64}$/.test(String(token))) return null;
  var raw = CacheService.getScriptCache().get('qt_phien_' + token);
  if (!raw) return null;
  var phien = JSON.parse(raw);
  return phienHopLe_(phien, PropertiesService.getScriptProperties().getProperty('QT_DOT')) ? phien : null;
}

function xuLyQuanTriKiemPhien_(token) {
  var phien = docPhienQuanTri_(token);
  return phien ? { ok: true, email: phien.email, unitCode: phien.unitCode } : { ok: false, hetPhien: true };
}

function xuLyQuanTriDangXuat_(token) {
  if (token && /^[0-9a-f]{64}$/.test(String(token))) CacheService.getScriptCache().remove('qt_phien_' + token);
  return { ok: true };
}
