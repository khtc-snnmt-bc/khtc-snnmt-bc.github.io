// ============================================================
// bcsnn · gas/PhanQuyen.js
// Vai trò  : Quản trị Tài khoản + Phân quyền (giao bảng, đơn vị quản lý) và
//            tự chia sẻ / gỡ quyền file Drive cho khớp Sheet quản lý
// Lớp      : gas — gọi bởi: Code.js, DangNhap.js · gọi: QuanTri.js (docPhienQuanTri_)
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 21:12
// ============================================================
// Quyền mong muốn (app tự quản, quản trị không chia sẻ tay — thiết kế mục 4.2):
// - File đơn vị: Gmail của đơn vị + Gmail của đơn vị quản lý bảng → SỬA.
// - File tổng (templateFileId): Gmail của đơn vị quản lý bảng → chỉ XEM
//   (số chỉ nhập ở file đơn vị — chủ dự án chốt 06/10/2026, không đồng bộ 2 chiều).
// Chỉ đụng quyền kiểu "user", bỏ qua chủ file. Chia sẻ không gửi thư.
// Giao bảng = dòng tab File (fileId để trống tới khi tạo file — b06c/d).

var VAI_TRO_HOP_LE = ['Nhập liệu', 'Quản lý báo cáo', 'Quản trị'];
var QUYEN_SUA = 'writer';
var QUYEN_XEM = 'reader';
var COT_DON_VI_QUAN_LY = 'managerUnits';   // một bảng có thể nhiều đơn vị quản lý: "A, B"

// ---------- Hàm thuần (kiểm bằng Node: kiem-thu/kiem-gas-phan-quyen.mjs) ----------

function chuanHoaEmail_(email) {
  return String(email || '').toLowerCase().trim();
}

function chiSoCot_(tieuDe, ten) {
  return (tieuDe || []).map(function (o) { return String(o).trim(); }).indexOf(ten);
}

/** 'A, B,,A' → ['A', 'B'] — ô nhiều mã đơn vị, cách nhau dấu phẩy. */
function tachDsMa_(o) {
  var kq = [];
  String(o || '').split(',').forEach(function (m) {
    m = m.trim();
    if (m && kq.indexOf(m) < 0) kq.push(m);
  });
  return kq;
}

/** Tab Bảng → [{tableCode, tableName, group, templateFileId, managerUnits: []}] (đọc cột theo tên). */
function docBangQuanLy_(dsBang) {
  if (!dsBang || !dsBang.length) return [];
  var td = dsBang[0];
  var cot = function (ten, macDinh) { var i = chiSoCot_(td, ten); return i < 0 ? macDinh : i; };
  var cMa = cot('tableCode', 0), cTen = cot('tableName', 1), cNhom = cot('group', 2);
  var cMau = cot('templateFileId', -1), cQl = cot(COT_DON_VI_QUAN_LY, -1);
  var kq = [];
  for (var i = 1; i < dsBang.length; i++) {
    var r = dsBang[i];
    var ma = String(r[cMa] || '').trim();
    if (!ma) continue;
    kq.push({
      tableCode: ma,
      tableName: String(r[cTen] || ma).trim(),
      group: String(r[cNhom] || '').trim(),
      templateFileId: cMau < 0 ? '' : String(r[cMau] || '').trim(),
      managerUnits: cQl < 0 ? [] : tachDsMa_(r[cQl])
    });
  }
  return kq;
}

/** Tab File → [{unitCode, tableCode, fileId}] */
function docFileQuanLy_(dsFile) {
  var kq = [];
  for (var i = 1; i < (dsFile || []).length; i++) {
    var r = dsFile[i];
    var uc = String(r[0] || '').trim(), tc = String(r[1] || '').trim();
    if (uc && tc) kq.push({ unitCode: uc, tableCode: tc, fileId: String(r[2] || '').trim() });
  }
  return kq;
}

/** Tab Tài khoản → { unitCode: [email] } */
function emailTheoDonVi_(dsTaiKhoan) {
  var kq = {};
  for (var i = 1; i < (dsTaiKhoan || []).length; i++) {
    var em = chuanHoaEmail_(dsTaiKhoan[i][0]), uc = String(dsTaiKhoan[i][1] || '').trim();
    if (!em || !uc) continue;
    kq[uc] = kq[uc] || [];
    if (kq[uc].indexOf(em) < 0) kq[uc].push(em);
  }
  return kq;
}

/**
 * Những file cần soát quyền khi đổi tài khoản của các đơn vị / phân quyền các bảng.
 * Đơn vị là đơn vị quản lý của bảng nào thì kéo theo mọi file của bảng đó.
 * @returns {Array<string>} fileId
 */
function fileTrongPhamVi_(bang, file, phamVi) {
  var dsDv = phamVi.unitCodes || [], dsBangChon = (phamVi.tableCodes || []).slice();
  bang.forEach(function (b) {
    var laQuanLy = b.managerUnits.some(function (uc) { return dsDv.indexOf(uc) >= 0; });
    if (laQuanLy && dsBangChon.indexOf(b.tableCode) < 0) dsBangChon.push(b.tableCode);
  });
  var kq = [];
  function them(id) { if (id && kq.indexOf(id) < 0) kq.push(id); }
  bang.forEach(function (b) { if (dsBangChon.indexOf(b.tableCode) >= 0) them(b.templateFileId); });
  file.forEach(function (f) {
    if (dsDv.indexOf(f.unitCode) >= 0 || dsBangChon.indexOf(f.tableCode) >= 0) them(f.fileId);
  });
  return kq;
}

/** Quyền mong muốn của mọi file: { fileId: { email: 'writer'|'reader' } } — SỬA thắng XEM. */
function quyenMongMuon_(bang, file, emailDv) {
  var kq = {};
  function dat(id, ds, quyen) {
    if (!id) return;
    kq[id] = kq[id] || {};
    (ds || []).forEach(function (em) { if (kq[id][em] !== QUYEN_SUA) kq[id][em] = quyen; });
  }
  var quanLyCua = {};
  bang.forEach(function (b) {
    quanLyCua[b.tableCode] = b.managerUnits;
    b.managerUnits.forEach(function (uc) { dat(b.templateFileId, emailDv[uc], QUYEN_XEM); });
  });
  file.forEach(function (f) {
    dat(f.fileId, emailDv[f.unitCode], QUYEN_SUA);
    (quanLyCua[f.tableCode] || []).forEach(function (uc) { dat(f.fileId, emailDv[uc], QUYEN_SUA); });
  });
  return kq;
}

/**
 * So quyền mong muốn với quyền đang có của một file.
 * @param {Object<string,string>} mong — { email: role }
 * @param {Array<{id, emailAddress, role, type}>} hienCo — từ Drive.Permissions.list
 * @returns {{them: Array, doi: Array, go: Array}}
 */
function chenhLechQuyen_(mong, hienCo) {
  var kq = { them: [], doi: [], go: [] };
  var daCo = {};
  (hienCo || []).forEach(function (p) {
    if (p.type !== 'user') return;
    var em = chuanHoaEmail_(p.emailAddress);
    daCo[em] = p;
    if (p.role === 'owner') return;
    if (!mong[em]) kq.go.push({ id: p.id, email: em });
    else if (p.role !== mong[em]) kq.doi.push({ id: p.id, email: em, role: mong[em] });
  });
  Object.keys(mong || {}).forEach(function (em) {
    if (!daCo[em]) kq.them.push({ email: em, role: mong[em] });
  });
  return kq;
}

/** Kiểm danh sách Gmail quản trị gửi lên cho một đơn vị → {ds} hoặc {loi}. */
function kiemDsTaiKhoan_(ds) {
  if (!Array.isArray(ds)) return { loi: 'Danh sách tài khoản không hợp lệ' };
  var kq = [], da = {};
  for (var i = 0; i < ds.length; i++) {
    var em = chuanHoaEmail_(ds[i] && ds[i].email);
    var role = String((ds[i] && ds[i].role) || 'Nhập liệu').trim();
    if (!em) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { loi: 'Gmail "' + em + '" không đúng dạng' };
    if (da[em]) return { loi: 'Gmail "' + em + '" bị lặp' };
    if (VAI_TRO_HOP_LE.indexOf(role) < 0) return { loi: 'Vai trò "' + role + '" không hợp lệ' };
    da[em] = true;
    kq.push({ email: em, role: role });
  }
  return { ds: kq };
}

/** Dòng mới của tab Tài khoản (không kèm tiêu đề): giữ đơn vị khác, thay dòng của unitCode. */
function thayTaiKhoanDonVi_(dsTaiKhoan, unitCode, dsMoi) {
  var giu = (dsTaiKhoan || []).slice(1).filter(function (r) {
    return chuanHoaEmail_(r[0]) && String(r[1] || '').trim() !== unitCode;
  }).map(function (r) { return [chuanHoaEmail_(r[0]), String(r[1]).trim(), String(r[2] || 'Nhập liệu').trim()]; });
  return giu.concat(dsMoi.map(function (d) { return [d.email, unitCode, d.role]; }));
}

/**
 * Dòng mới của tab File khi giao bảng tableCode cho dsDonVi.
 * Đơn vị đã có file thì không bỏ giao được (giữ lại, báo về) — tránh mất file.
 * @returns {{dong: Array<Array>, giuLai: Array<string>}}
 */
function capNhatGiao_(dsFile, tableCode, dsDonVi) {
  var dong = [], giuLai = [], daCo = [];
  (dsFile || []).slice(1).forEach(function (r) {
    if (!String(r[0] || '').trim()) return;
    r = [r[0], r[1], r[2] || '', r[3] || ''];   // đúng 4 cột: unitCode, tableCode, fileId, createdAt
    var uc = String(r[0]).trim();
    if (String(r[1] || '').trim() !== tableCode) { dong.push(r); return; }
    if (dsDonVi.indexOf(uc) >= 0 || String(r[2] || '').trim()) {
      dong.push(r);
      daCo.push(uc);
      if (dsDonVi.indexOf(uc) < 0) giuLai.push(uc);
    }
  });
  dsDonVi.forEach(function (uc) {
    if (daCo.indexOf(uc) < 0) { dong.push([uc, tableCode, '', '']); daCo.push(uc); }
  });
  return { dong: dong, giuLai: giuLai };
}

// ---------- Chạm Drive ----------

function docQuyenFile_(fileId) {
  var res = Drive.Permissions.list(fileId, { fields: 'permissions(id,emailAddress,role,type)' });
  return res.permissions || [];
}

function apQuyenFile_(fileId, chenh, tong) {
  chenh.them.forEach(function (q) {
    Drive.Permissions.create({ role: q.role, type: 'user', emailAddress: q.email }, fileId, { sendNotificationEmail: false });
    tong.them++;
  });
  chenh.doi.forEach(function (q) { Drive.Permissions.update({ role: q.role }, fileId, q.id); tong.doi++; });
  chenh.go.forEach(function (q) { Drive.Permissions.remove(fileId, q.id); tong.go++; });
}

/** Soát + sửa quyền các file trong phạm vi cho khớp Sheet quản lý. Lỗi từng file ghi lại, không dừng. */
function dongBoQuyen_(ss, phamVi) {
  var bang = docBangQuanLy_(docTabQuanLy_(ss, 'Bảng'));
  var file = docFileQuanLy_(docTabQuanLy_(ss, 'File'));
  var mong = quyenMongMuon_(bang, file, emailTheoDonVi_(docTabQuanLy_(ss, 'Tài khoản')));
  var tong = { soFile: 0, them: 0, doi: 0, go: 0, loi: [] };
  fileTrongPhamVi_(bang, file, phamVi).forEach(function (id) {
    try {
      apQuyenFile_(id, chenhLechQuyen_(mong[id] || {}, docQuyenFile_(id)), tong);
      tong.soFile++;
    } catch (err) {
      tong.loi.push(String(err.message || err));
    }
  });
  return tong;
}

/** Ghi đè phần dữ liệu (dưới dòng tiêu đề) của một tab Sheet quản lý. */
function ghiDeDuLieuTab_(tab, soCot, dong) {
  var cu = tab.getLastRow();
  if (cu > 1) tab.getRange(2, 1, cu - 1, Math.max(soCot, tab.getLastColumn())).clearContent();
  if (dong.length) tab.getRange(2, 1, dong.length, soCot).setValues(dong);
}

// ---------- Action quản trị (mọi action kiểm phiên trước) ----------

function quanTriChay_(token, viec) {
  if (!docPhienQuanTri_(token)) return { ok: false, hetPhien: true, loi: 'Phiên quản trị đã hết hạn' };
  var id = layQuanLyId_();
  if (!id) return { ok: false, loi: 'Chưa cấu hình Sheet quản lý' };
  var khoa = LockService.getScriptLock();
  try {
    khoa.waitLock(30000);
    return viec(SpreadsheetApp.openById(id), docPhienQuanTri_(token));
  } catch (err) {
    return { ok: false, loi: 'Lỗi máy chủ: ' + String(err.message || err) };
  } finally {
    khoa.releaseLock();
  }
}

/** Toàn bộ dữ liệu cho trang quản trị (người đã qua mật khẩu quản trị mới gọi được). */
function xuLyQtLayDuLieu_(token) {
  return quanTriChay_(token, function (ss) {
    var dv = xuLyLayDonVi_(ss.getId());
    if (!dv.ok) return dv;
    return {
      ok: true,
      donVi: dv.donVi.map(function (d) { return { unitCode: d.unitCode, unitName: d.unitName }; }),
      taiKhoan: docTabQuanLy_(ss, 'Tài khoản').slice(1).filter(function (r) { return r[0]; }).map(function (r) {
        return { email: chuanHoaEmail_(r[0]), unitCode: String(r[1]).trim(), role: String(r[2] || 'Nhập liệu').trim() };
      }),
      bang: docBangQuanLy_(docTabQuanLy_(ss, 'Bảng')).map(function (b) {
        return { tableCode: b.tableCode, tableName: b.tableName, group: b.group, managerUnits: b.managerUnits };
      }),
      giao: docFileQuanLy_(docTabQuanLy_(ss, 'File')).map(function (f) {
        return { unitCode: f.unitCode, tableCode: f.tableCode, coFile: !!f.fileId };
      })
    };
  });
}

function xuLyQtLuuTaiKhoan_(token, unitCode, ds) {
  return quanTriChay_(token, function (ss, phien) {
    var uc = String(unitCode || '').trim();
    if (!uc) return { ok: false, loi: 'Chưa chọn đơn vị' };
    var kiem = kiemDsTaiKhoan_(ds);
    if (kiem.loi) return { ok: false, loi: kiem.loi };
    var tab = ss.getSheetByName('Tài khoản');
    var dong = thayTaiKhoanDonVi_(tab.getDataRange().getValues(), uc, kiem.ds);
    if (!laTaiKhoanQuanTri_([['email', 'unitCode', 'role']].concat(dong), phien.email, phien.unitCode)) {
      return { ok: false, loi: 'Không thể gỡ quyền quản trị của chính Gmail đang đăng nhập.' };
    }
    ghiDeDuLieuTab_(tab, 3, dong);
    SpreadsheetApp.flush();
    return { ok: true, quyen: dongBoQuyen_(ss, { unitCodes: [uc] }) };
  });
}

function xuLyQtLuuPhanQuyen_(token, tableCode, managerUnits, dsDonVi) {
  return quanTriChay_(token, function (ss) {
    if (!Array.isArray(managerUnits)) return { ok: false, loi: 'Danh sách đơn vị quản lý không hợp lệ' };
    var tc = String(tableCode || '').trim(), ql = tachDsMa_(managerUnits.join(',')).join(', ');
    var tabBang = ss.getSheetByName('Bảng');
    var gtBang = tabBang.getDataRange().getValues();
    var dongBang = gtBang.map(function (r) { return String(r[chiSoCot_(gtBang[0], 'tableCode')]).trim(); }).indexOf(tc);
    if (!tc || dongBang < 1) return { ok: false, loi: 'Không tìm thấy bảng ' + tc };
    if (!Array.isArray(dsDonVi)) return { ok: false, loi: 'Danh sách đơn vị không hợp lệ' };

    var cotQl = chiSoCot_(gtBang[0], COT_DON_VI_QUAN_LY);
    if (cotQl < 0) {
      cotQl = gtBang[0].length;
      tabBang.getRange(1, cotQl + 1).setValue(COT_DON_VI_QUAN_LY).setFontWeight('bold');
    }
    tabBang.getRange(dongBang + 1, cotQl + 1).setNumberFormat('@').setValue(ql);

    var tabFile = ss.getSheetByName('File');
    var giao = capNhatGiao_(tabFile.getDataRange().getValues(),
      tc, dsDonVi.map(function (u) { return String(u).trim(); }).filter(String));
    ghiDeDuLieuTab_(tabFile, 4, giao.dong);
    SpreadsheetApp.flush();
    var quyen = dongBoQuyen_(ss, { tableCodes: [tc] });
    return { ok: true, giuLai: giao.giuLai, quyen: quyen };
  });
}
