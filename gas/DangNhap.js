// ============================================================
// bcsnn · gas/DangNhap.js
// Vai trò  : Xử lý đăng nhập và danh mục đơn vị phía Google Apps Script
// Lớp      : gas backend — đọc Sheet quản lý, trả JSON · gọi: PhanQuyen.js (docBangQuanLy_, docFileQuanLy_, themToanQuyen_, donViToanQuyen_)
// Phiên bản: 0.7.0 · Cập nhật: 08/10/2026 09:05
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

  // Phân biệt: Gmail có trong hệ thống nhưng ở đơn vị khác ↔ Gmail chưa được cấp quyền ở đâu cả
  var coODonViKhac = dsTaiKhoan.some(function (row, i) {
    return i > 0 && String(row[0] || '').toLowerCase().trim() === em;
  });
  return {
    hopLe: false,
    loi: coODonViKhac
      ? 'Gmail "' + em + '" không thuộc đơn vị đã chọn. Hãy xoá ô đơn vị rồi đăng nhập lại để hệ thống tự nhận đơn vị.'
      : 'Gmail "' + em + '" chưa được cấp quyền nhập liệu. Vui lòng liên hệ Phòng KHTC để được cấp quyền.'
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

/**
 * Đăng nhập chưa chọn đơn vị: Gmail thuộc đúng một đơn vị thì lấy đơn vị đó (hàm thuần).
 * @returns {{unitCode?: string, loi?: string, donVi?: Array}}
 */
function chonDonViTheoEmail_(dsTaiKhoan, dsDonVi, email) {
  var ds = timDonViTheoEmail_(dsTaiKhoan, dsDonVi, email);
  if (ds.length === 1) return { unitCode: ds[0].unitCode };
  if (!ds.length) return { loi: 'Gmail "' + String(email || '').toLowerCase().trim() + '" chưa được cấp quyền nhập liệu.' };
  return { loi: 'Gmail này dùng cho nhiều đơn vị — vui lòng chọn đơn vị.', donVi: ds };
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
 * Bảng mà đơn vị là đơn vị quản lý (hàm thuần): fileId = file tổng, donVi = file
 * từng đơn vị đã tạo (xếp theo tên). Bảng chưa có file tổng vẫn hiện nếu có file đơn vị.
 * @returns {Array<object>} [{ tableCode, tableName, group, fileId, donVi: [{unitCode, unitName, fileId}] }]
 */
function bangQuanLyCuaDonVi_(dsBang, dsFile, dsDonVi, unitCode) {
  var uc = String(unitCode || '').trim();
  var file = docFileQuanLy_(dsFile);
  // Đơn vị nhóm Quản trị (Quản trị / Quản lý báo cáo) mặc định quản lý mọi bảng
  return themToanQuyen_(docBangQuanLy_(dsBang), donViToanQuyen_(dsDonVi)).filter(function (b) { return uc && b.managerUnits.indexOf(uc) >= 0; }).map(function (b) {
    var donVi = file.filter(function (f) { return f.tableCode === b.tableCode && f.fileId; }).map(function (f) {
      return { unitCode: f.unitCode, unitName: layTenDonVi_(dsDonVi, f.unitCode), fileId: f.fileId };
    }).sort(function (a, c) { return a.unitName.localeCompare(c.unitName, 'vi', { numeric: true }); });
    return { tableCode: b.tableCode, tableName: b.tableName, group: b.group, fileId: b.templateFileId, donVi: donVi };
  }).filter(function (b) { return b.fileId || b.donVi.length; });
}

/** Danh sách bảng ở sidebar: bảng mình quản lý trước, rồi bảng được giao nhập (bỏ trùng). */
function danhSachBangDangNhap_(dsBang, dsFile, dsDonVi, unitCode) {
  var quanLy = bangQuanLyCuaDonVi_(dsBang, dsFile, dsDonVi, unitCode);
  var maQl = quanLy.map(function (b) { return b.tableCode; });
  return quanLy.concat(ghepDanhSachBang_(dsBang, dsFile, unitCode).filter(function (b) {
    return maQl.indexOf(b.tableCode) < 0;
  }));
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
    var tabDonVi = ss.getSheetByName('Đơn vị');
    var duLieuDV = tabDonVi ? tabDonVi.getDataRange().getValues() : [];

    // Chưa chọn đơn vị → suy từ Gmail (đăng nhập ngay, không chờ danh sách đơn vị)
    if (!String(unitCode || '').trim()) {
      var chon = chonDonViTheoEmail_(duLieuTK, duLieuDV, email);
      if (!chon.unitCode) return { ok: false, loi: chon.loi, donVi: chon.donVi };
      unitCode = chon.unitCode;
    }

    var kqKiemTra = kiemTraTaiKhoan_(duLieuTK, email, unitCode);
    if (!kqKiemTra.hopLe) return { ok: false, loi: kqKiemTra.loi };

    // 2. Lấy tên đơn vị
    var unitName = layTenDonVi_(duLieuDV, unitCode);

    // 3. Ghép danh sách bảng và fileId
    var tabBang = ss.getSheetByName('Bảng');
    var tabFile = ss.getSheetByName('File');
    var duLieuBang = tabBang ? tabBang.getDataRange().getValues() : [];
    var duLieuFile = tabFile ? tabFile.getDataRange().getValues() : [];

    var dsBang = danhSachBangDangNhap_(duLieuBang, duLieuFile, duLieuDV, unitCode);

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

/**
 * Đăng nhập cách mới (index.html): Gmail lấy từ mã Google đã xác minh,
 * không tin Gmail trình duyệt gửi lên → biết Gmail người khác cũng không vào được.
 */
function xuLyDangNhapGoogle_(quanLyId, accessToken, unitCode) {
  var xm = xacMinhMaTruyCap_(accessToken);
  if (!xm.ok) return xm;
  var kq = xuLyDangNhap_(quanLyId, xm.email, unitCode);
  if (kq.ok) kq.ve = taoVe_(xm.email, kyTenVe_); // trình duyệt nhớ, lần sau vào thẳng
  return kq;
}

/** Mở lại bằng vé đã nhớ: kiểm chữ ký rồi kiểm Tài khoản như đăng nhập thường. */
function xuLyDangNhapVe_(quanLyId, ve, unitCode) {
  var email = docVe_(ve, kyTenVe_);
  if (!email) return { ok: false, loi: 'Vé đăng nhập không hợp lệ, vui lòng đăng nhập lại.' };
  return xuLyDangNhap_(quanLyId, email, unitCode);
}
