// ============================================================
// bcsnn · gas/DangNhap.js
// Vai trò  : Xử lý đăng nhập và danh mục đơn vị phía Google Apps Script
// Lớp      : gas backend — đọc Sheet quản lý, trả JSON
// Phiên bản: 0.2.0 · Cập nhật: 05/10/2026 22:32
// ============================================================

/**
 * Xử lý yêu cầu lấy danh sách đơn vị.
 * @param {string} quanLyId - ID file Sheet quản lý
 * @returns {object} { ok: boolean, donVi: Array }
 */
function xuLyLayDonVi_(quanLyId) {
  if (!quanLyId) return { ok: false, loi: 'Chưa cấu hình Sheet quản lý' };
  try {
    var ss = SpreadsheetApp.openById(quanLyId);
    var tabDonVi = ss.getSheetByName('Đơn vị');
    if (!tabDonVi) return { ok: false, loi: 'Không tìm thấy tab "Đơn vị" trong Sheet quản lý' };

    var duLieu = tabDonVi.getDataRange().getValues();
    var tieuDe = duLieu[0];
    var ds = [];
    for (var i = 1; i < duLieu.length; i++) {
      var r = duLieu[i];
      if (r[0]) {
        ds.push({
          unitCode: String(r[0]).trim(),
          unitName: String(r[1] || r[0]).trim(),
          region: r[2] || '',
          role: r[3] || ''
        });
      }
    }
    return { ok: true, donVi: ds };
  } catch (err) {
    return { ok: false, loi: 'Lỗi đọc danh sách đơn vị: ' + String(err) };
  }
}

/**
 * Kiểm tra tài khoản trong danh sách tài khoản (hàm thuần, có thể kiểm bằng Node).
 * @param {Array<Array>} dsTaiKhoan - mảng các dòng trong tab Tài khoản (kèm tiêu đề)
 * @param {string} email
 * @param {string} unitCode
 * @returns {object} { hopLe: boolean, role: string, loi?: string }
 */
function kiemTraTaiKhoan_(dsTaiKhoan, email, unitCode) {
  var em = String(email || '').toLowerCase().trim();
  var uc = String(unitCode || '').trim();

  if (!em || !uc) return { hopLe: false, loi: 'Email hoặc đơn vị để trống' };

  for (var i = 1; i < dsTaiKhoan.length; i++) {
    var row = dsTaiKhoan[i];
    var rowEmail = String(row[0] || '').toLowerCase().trim();
    var rowUnit = String(row[1] || '').trim();
    var role = String(row[2] || 'Nhập liệu').trim();

    if (rowEmail === em && rowUnit === uc) {
      return { hopLe: true, role: role };
    }
  }

  return {
    hopLe: false,
    loi: 'Tài khoản Gmail "' + em + '" chưa được phân quyền cho đơn vị đã chọn.'
  };
}

/**
 * Gmail được phân công của MỘT đơn vị (hàm thuần). Không bao giờ trả cả bảng.
 * @returns {Array<string>}
 */
function layEmailCuaDonVi_(dsTaiKhoan, unitCode) {
  var uc = String(unitCode || '').trim();
  var kq = [];
  if (!uc) return kq;
  for (var i = 1; i < dsTaiKhoan.length; i++) {
    var email = String(dsTaiKhoan[i][0] || '').toLowerCase().trim();
    if (email && String(dsTaiKhoan[i][1] || '').trim() === uc && kq.indexOf(email) < 0) kq.push(email);
  }
  return kq;
}

/**
 * Các đơn vị của một Gmail gõ đủ — chỉ khớp chính xác, không liệt kê (hàm thuần).
 * @returns {Array<{unitCode: string, unitName: string}>}
 */
function timDonViTheoEmail_(dsTaiKhoan, dsDonVi, email) {
  var em = String(email || '').toLowerCase().trim();
  var kq = [];
  if (!em) return kq;
  for (var i = 1; i < dsTaiKhoan.length; i++) {
    if (String(dsTaiKhoan[i][0] || '').toLowerCase().trim() !== em) continue;
    var uc = String(dsTaiKhoan[i][1] || '').trim();
    if (uc && !kq.some(function (d) { return d.unitCode === uc; })) {
      kq.push({ unitCode: uc, unitName: layTenDonVi_(dsDonVi, uc) });
    }
  }
  return kq;
}

/** Đọc một tab của Sheet quản lý thành mảng dòng (kèm tiêu đề), tab thiếu → []. */
function docTabQuanLy_(ss, ten) {
  var tab = ss.getSheetByName(ten);
  return tab ? tab.getDataRange().getValues() : [];
}

function xuLyLayTaiKhoan_(quanLyId, unitCode) {
  if (!quanLyId) return { ok: false, loi: 'Chưa cấu hình Sheet quản lý' };
  try {
    var ss = SpreadsheetApp.openById(quanLyId);
    return { ok: true, emails: layEmailCuaDonVi_(docTabQuanLy_(ss, 'Tài khoản'), unitCode) };
  } catch (err) {
    return { ok: false, loi: 'Lỗi đọc tài khoản: ' + String(err) };
  }
}

function xuLyTimDonViTheoEmail_(quanLyId, email) {
  if (!quanLyId) return { ok: false, loi: 'Chưa cấu hình Sheet quản lý' };
  try {
    var ss = SpreadsheetApp.openById(quanLyId);
    return { ok: true, donVi: timDonViTheoEmail_(docTabQuanLy_(ss, 'Tài khoản'), docTabQuanLy_(ss, 'Đơn vị'), email) };
  } catch (err) {
    return { ok: false, loi: 'Lỗi tìm đơn vị: ' + String(err) };
  }
}

/**
 * Lấy tên đơn vị từ bảng Đơn vị (hàm thuần).
 */
function layTenDonVi_(dsDonVi, unitCode) {
  var uc = String(unitCode || '').trim();
  for (var i = 1; i < dsDonVi.length; i++) {
    if (String(dsDonVi[i][0]).trim() === uc) {
      return String(dsDonVi[i][1] || uc).trim();
    }
  }
  return uc;
}

/**
 * Ghép danh sách bảng được phân công cùng fileId tương ứng của đơn vị (hàm thuần).
 * @param {Array<Array>} dsBang - các dòng trong tab Bảng
 * @param {Array<Array>} dsFile - các dòng trong tab File
 * @param {string} unitCode
 * @returns {Array<object>} [{ tableCode, tableName, group, periodType, fileId }]
 */
function ghepDanhSachBang_(dsBang, dsFile, unitCode) {
  var uc = String(unitCode || '').trim();
  var bangTheoMa = {};

  // Tab Bảng: tableCode, tableName, group, periodType, ...
  for (var i = 1; i < dsBang.length; i++) {
    var r = dsBang[i];
    var code = String(r[0] || '').trim();
    if (code) {
      bangTheoMa[code] = {
        tableCode: code,
        tableName: String(r[1] || code).trim(),
        group: String(r[2] || '').trim(),
        periodType: String(r[3] || 'thang').trim()
      };
    }
  }

  // Tab File: unitCode, tableCode, fileId, createdAt
  var ketQua = [];
  for (var j = 1; j < dsFile.length; j++) {
    var f = dsFile[j];
    var fUnit = String(f[0] || '').trim();
    var fTable = String(f[1] || '').trim();
    var fileId = String(f[2] || '').trim();

    if (fUnit === uc && bangTheoMa[fTable] && fileId) {
      ketQua.push({
        tableCode: fTable,
        tableName: bangTheoMa[fTable].tableName,
        group: bangTheoMa[fTable].group,
        periodType: bangTheoMa[fTable].periodType,
        fileId: fileId
      });
    }
  }

  return ketQua;
}

/**
 * Xử lý đăng nhập toàn trình: kiểm quyền và lấy danh sách file.
 */
function xuLyDangNhap_(quanLyId, email, unitCode) {
  if (!quanLyId) return { ok: false, loi: 'Chưa cấu hình Sheet quản lý' };

  try {
    var ss = SpreadsheetApp.openById(quanLyId);

    // 1. Kiểm tra tài khoản
    var tabTaiKhoan = ss.getSheetByName('Tài khoản');
    if (!tabTaiKhoan) return { ok: false, loi: 'Không tìm thấy tab "Tài khoản"' };
    var duLieuTK = tabTaiKhoan.getDataRange().getValues();
    var kqKiemTra = kiemTraTaiKhoan_(duLieuTK, email, unitCode);
    if (!kqKiemTra.hopLe) return { ok: false, loi: kqKiemTra.loi };

    // 2. Lấy tên đơn vị
    var tabDonVi = ss.getSheetByName('Đơn vị');
    var duLieuDV = tabDonVi ? tabDonVi.getDataRange().getValues() : [];
    var unitName = layTenDonVi_(duLieuDV, unitCode);

    // 3. Ghép danh sách bảng và fileId
    var tabBang = ss.getSheetByName('Bảng');
    var tabFile = ss.getSheetByName('File');
    var duLieuBang = tabBang ? tabBang.getDataRange().getValues() : [];
    var duLieuFile = tabFile ? tabFile.getDataRange().getValues() : [];

    var dsBang = ghepDanhSachBang_(duLieuBang, duLieuFile, unitCode);

    return {
      ok: true,
      email: String(email).toLowerCase().trim(),
      unitCode: unitCode,
      unitName: unitName,
      role: kqKiemTra.role,
      tables: dsBang
    };
  } catch (err) {
    return { ok: false, loi: 'Lỗi máy chủ xác thực: ' + String(err) };
  }
}
