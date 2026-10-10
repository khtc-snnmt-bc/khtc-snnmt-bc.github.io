// ============================================================
// bcsnn · gas/PhanQuyen.js
// Vai trò  : Quản trị Tài khoản + Phân quyền (giao bảng) và
//            tự chia sẻ / gỡ quyền file Drive cho khớp Sheet quản lý của lĩnh vực
// Lớp      : gas — gọi bởi: Code.js, DangNhap.js, KyBaoCao.js, QuanLyBang.js · gọi: QuanTri.js, KyBaoCao.js (docKyQuanLy_), QuanLyBang.js (caiDatChoTrang_), Code.js (layQuanLyId_)
// Phiên bản: 0.10.0 · Cập nhật: 10/10/2026 17:30
// ============================================================
// Quyền mong muốn (app tự quản, quản trị không chia sẻ tay — thiết kế mục 4.2):
// - File đơn vị: Gmail của đơn vị theo cột access tab File (sua → SỬA, xem → XEM,
//   khong → không chia; ô trống = sua) + Gmail của đơn vị quản lý → SỬA.
//   Bỏ quyền đơn vị đã có file thì giữ dòng (access = khong), không mất file.
// - File tổng (templateFileId): Gmail của đơn vị quản lý → chỉ XEM
//   (số chỉ nhập ở file đơn vị — chủ dự án chốt 06/10/2026, không đồng bộ 2 chiều).
// - Đơn vị quản lý = đơn vị nhóm Quản trị của lĩnh vực (tab Đơn vị): Quản trị quản lý mọi
//   bảng; Quản lý báo cáo quản lý bảng ở cột E manageTables, trống = mọi bảng (b11).
// - Bảng công khai (shareType = congKhai): file đơn vị được nhập (sua) thêm quyền
//   "Bất kỳ ai có link đều sửa được" khi bảng còn kỳ đang mở; hết kỳ mở → tắt
//   (KIEN-TRUC.md mục 4, so-tay/chia-se-cong-khai.md). File khác không bao giờ công khai.
// Chỉ đụng quyền kiểu "user" + "anyone", bỏ qua chủ file. Chia sẻ không gửi thư.
// Giao bảng = dòng tab File (fileId để trống tới khi tạo file — b06c/d).

var VAI_TRO_HOP_LE = ['Nhập liệu', 'Quản lý báo cáo', 'Quản trị'];
var VAI_TRO_DON_VI_TOAN_QUYEN = ['Quản trị', 'Quản lý báo cáo'];
var QUYEN_SUA = 'writer';
var QUYEN_XEM = 'reader';
var COT_QUYEN_DON_VI = 'access';           // cột E tab File
var QUYEN_DON_VI = ['sua', 'xem', 'khong'];
var CHIA_SE_MOI = 'moi';                   // cột shareType tab Bảng: mời theo Gmail
var CHIA_SE_CONG_KHAI = 'congKhai';        // nhập không cần đăng nhập

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

/** Ô shareType → 'congKhai' | 'moi' (trống / lạ = mời theo Gmail). */
function chuanChiaSe_(o) {
  return String(o === undefined || o === null ? '' : o).trim() === CHIA_SE_CONG_KHAI ? CHIA_SE_CONG_KHAI : CHIA_SE_MOI;
}

/** Tab Bảng → [{tableCode, tableName, templateFileId, shareType}] (đọc cột theo tên). */
function docBangQuanLy_(dsBang) {
  if (!dsBang || !dsBang.length) return [];
  var td = dsBang[0];
  var cot = function (ten, macDinh) { var i = chiSoCot_(td, ten); return i < 0 ? macDinh : i; };
  var cMa = cot('tableCode', 0), cTen = cot('tableName', 1);
  var cMau = cot('templateFileId', -1), cChiaSe = cot('shareType', -1);
  var kq = [];
  for (var i = 1; i < dsBang.length; i++) {
    var r = dsBang[i];
    var ma = String(r[cMa] || '').trim();
    if (!ma) continue;
    kq.push({
      tableCode: ma,
      tableName: String(r[cTen] || ma).trim(),
      templateFileId: cMau < 0 ? '' : String(r[cMau] || '').trim(),
      shareType: chuanChiaSe_(cChiaSe < 0 ? '' : r[cChiaSe])
    });
  }
  return kq;
}

/** Tab Đơn vị (unitCode | unitName | region | role) → mã các đơn vị nhóm Quản trị. */
function donViToanQuyen_(dsDonVi) {
  var kq = [];
  for (var i = 1; i < (dsDonVi || []).length; i++) {
    var ma = String(dsDonVi[i][0] || '').trim();
    if (ma && VAI_TRO_DON_VI_TOAN_QUYEN.indexOf(String(dsDonVi[i][3] || '').trim()) >= 0) kq.push(ma);
  }
  return kq;
}

/**
 * Tab Đơn vị → [{unitCode, tables}] các đơn vị nhóm Quản trị kèm bảng quản lý (cột E manageTables,
 * mã bảng cách dấu phẩy). tables rỗng = mọi bảng; vai trò Quản trị luôn mọi bảng.
 */
function phamViQuanLy_(dsDonVi) {
  var kq = [];
  for (var i = 1; i < (dsDonVi || []).length; i++) {
    var r = dsDonVi[i], ma = String(r[0] || '').trim(), vt = String(r[3] || '').trim();
    if (!ma || VAI_TRO_DON_VI_TOAN_QUYEN.indexOf(vt) < 0) continue;
    kq.push({ unitCode: ma, tables: vt === 'Quản lý báo cáo' ? tachDsMa_(r[4]) : [] });
  }
  return kq;
}

/** Đơn vị quản lý bảng tableCode không (pv: một phần tử của phamViQuanLy_, hoặc chỉ mã = mọi bảng). */
function quanLyBang_(pv, tableCode) {
  return typeof pv === 'string' || !pv.tables.length || pv.tables.indexOf(tableCode) >= 0;
}

/**
 * Bảng (docBangQuanLy_) kèm managerUnits — bản mới, không sửa bản gốc.
 * dsQuanLy: phamViQuanLy_ (hoặc mảng mã = quản lý mọi bảng).
 */
function themToanQuyen_(bang, dsQuanLy) {
  return bang.map(function (b) {
    return { tableCode: b.tableCode, tableName: b.tableName, templateFileId: b.templateFileId, shareType: b.shareType,
      managerUnits: dsQuanLy.filter(function (pv) { return quanLyBang_(pv, b.tableCode); })
        .map(function (pv) { return typeof pv === 'string' ? pv : pv.unitCode; }) };
  });
}

/** Mã các bảng đơn vị quản lý (theo phamViQuanLy_) trong dsMaBang. */
function bangQuanLyHieuLuc_(pv, dsMaBang) {
  return pv ? dsMaBang.filter(function (m) { return quanLyBang_(pv, m); }) : [];
}

/** Kiểm danh sách bảng quản lý gửi lên → {tables} (chỉ mã có trong dsMaBang, bỏ trùng) hoặc {loi}. */
function kiemBangQuanLy_(ds, dsMaBang) {
  if (!Array.isArray(ds)) return { loi: 'Danh sách bảng quản lý không hợp lệ' };
  var kq = tachDsMa_(ds.join(','));
  var la = kq.filter(function (m) { return dsMaBang.indexOf(m) < 0; });
  if (la.length) return { loi: 'Không có bảng ' + la.join(', ') };
  return { tables: kq };
}

/** Ô access tab File → 'sua' | 'xem' | 'khong' (trống / lạ = sua, như trước khi có cột). */
function chuanQuyenDv_(o) {
  var q = String(o || '').trim().toLowerCase();
  return QUYEN_DON_VI.indexOf(q) >= 0 ? q : 'sua';
}

/** Tab File → [{unitCode, tableCode, fileId, access}] */
function docFileQuanLy_(dsFile) {
  var kq = [];
  for (var i = 1; i < (dsFile || []).length; i++) {
    var r = dsFile[i];
    var uc = String(r[0] || '').trim(), tc = String(r[1] || '').trim();
    if (uc && tc) kq.push({ unitCode: uc, tableCode: tc, fileId: String(r[2] || '').trim(), access: chuanQuyenDv_(r[4]) });
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
  (phamVi.fileIds || []).forEach(them);
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
    if (f.access !== 'khong') dat(f.fileId, emailDv[f.unitCode], f.access === 'xem' ? QUYEN_XEM : QUYEN_SUA);
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

/** Bảng còn kỳ đang mở (chưa khoá) không — bỏ qua kỳ boQua (kỳ đang khoá / xoá). dsKy: docKyQuanLy_. */
function bangCoKyMo_(dsKy, tableCode, boQua) {
  return (dsKy || []).some(function (k) { return k.tableCode === tableCode && k.periodName !== boQua && !k.locked; });
}

/** File đơn vị để "Bất kỳ ai có link đều sửa được": bảng công khai + đơn vị được nhập + còn kỳ mở. */
function laCongKhai_(shareType, access, coKyMo) {
  return shareType === CHIA_SE_CONG_KHAI && access === 'sua' && !!coKyMo;
}

/** { fileId: true } — các file đơn vị phải công khai lúc này (bang: docBangQuanLy_, dsKy: docKyQuanLy_). */
function fileCongKhai_(bang, file, dsKy) {
  var chiaSe = {}, kq = {};
  bang.forEach(function (b) { chiaSe[b.tableCode] = b.shareType; });
  file.forEach(function (f) {
    if (f.fileId && laCongKhai_(chiaSe[f.tableCode], f.access, bangCoKyMo_(dsKy, f.tableCode))) kq[f.fileId] = true;
  });
  return kq;
}

/**
 * So quyền "bất kỳ ai" đang có với mong muốn → { them: bool, doi: [id], go: [id] }.
 * Muốn công khai: giữ đúng một quyền anyone = writer; không muốn: gỡ mọi quyền anyone.
 */
function chenhLechCongKhai_(muon, hienCo) {
  var kq = { them: false, doi: [], go: [] };
  var ds = (hienCo || []).filter(function (p) { return p.type === 'anyone'; });
  if (!muon) { kq.go = ds.map(function (p) { return p.id; }); return kq; }
  if (!ds.length) { kq.them = true; return kq; }
  var dung = ds.filter(function (p) { return p.role === QUYEN_SUA; });
  var giu = dung.length ? dung[0] : ds[0];
  if (giu.role !== QUYEN_SUA) kq.doi.push(giu.id);
  kq.go = ds.filter(function (p) { return p !== giu; }).map(function (p) { return p.id; });
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

/** Quyền gửi lên { unitCode: 'sua'|'xem'|'khong' } → {quyen} đã chuẩn hoá hoặc {loi}. */
function kiemQuyenGiao_(quyen) {
  if (!quyen || typeof quyen !== 'object' || Array.isArray(quyen)) return { loi: 'Danh sách đơn vị không hợp lệ' };
  var kq = {};
  for (var uc in quyen) {
    var q = String(quyen[uc] || '').trim();
    if (QUYEN_DON_VI.indexOf(q) < 0) return { loi: 'Quyền "' + q + '" không hợp lệ' };
    if (String(uc).trim()) kq[String(uc).trim()] = q;
  }
  return { quyen: kq };
}

/**
 * Dòng mới của tab File (5 cột: unitCode, tableCode, fileId, createdAt, access) khi đặt
 * quyền bảng tableCode. Đơn vị không có trong quyen = khong. Đã có file thì giữ dòng
 * (access = khong — đơn vị không thấy file, file vẫn còn); chưa có file thì bỏ dòng.
 * @returns {{dong: Array<Array>}}
 */
function capNhatGiao_(dsFile, tableCode, quyen) {
  var dong = [], daCo = [];
  (dsFile || []).slice(1).forEach(function (r) {
    if (!String(r[0] || '').trim()) return;
    var uc = String(r[0]).trim(), coFile = !!String(r[2] || '').trim();
    if (String(r[1] || '').trim() !== tableCode) { dong.push([r[0], r[1], r[2] || '', r[3] || '', r[4] || '']); return; }
    var q = quyen[uc] || 'khong';
    if (q === 'khong' && !coFile) return;
    dong.push([r[0], r[1], r[2] || '', r[3] || '', q]);
    daCo.push(uc);
  });
  Object.keys(quyen).forEach(function (uc) {
    if (daCo.indexOf(uc) < 0 && quyen[uc] !== 'khong') { dong.push([uc, tableCode, '', '', quyen[uc]]); daCo.push(uc); }
  });
  return { dong: dong };
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

/** Áp chenhLechCongKhai_ lên file; tong (tuỳ chọn) đếm như apQuyenFile_. Trả true nếu có đổi. */
function apCongKhai_(fileId, chenh, tong) {
  tong = tong || { them: 0, doi: 0, go: 0 };
  if (chenh.them) {
    Drive.Permissions.create({ role: QUYEN_SUA, type: 'anyone', allowFileDiscovery: false }, fileId);
    tong.them++;
  }
  chenh.doi.forEach(function (id) { Drive.Permissions.update({ role: QUYEN_SUA }, fileId, id); tong.doi++; });
  chenh.go.forEach(function (id) { Drive.Permissions.remove(fileId, id); tong.go++; });
  return chenh.them || chenh.doi.length > 0 || chenh.go.length > 0;
}

/** Bật / tắt "Bất kỳ ai có link đều sửa được" cho một file (tạo, khoá, xoá kỳ gọi theo từng file). */
function datCongKhai_(fileId, muon) {
  return apCongKhai_(fileId, chenhLechCongKhai_(muon, docQuyenFile_(fileId)));
}

/** Soát + sửa quyền các file trong phạm vi cho khớp Sheet quản lý. Lỗi từng file ghi lại, không dừng. */
function dongBoQuyen_(ss, phamVi) {
  var bang = themToanQuyen_(docBangQuanLy_(docTabQuanLy_(ss, 'Bảng')), phamViQuanLy_(docTabQuanLy_(ss, 'Đơn vị')));
  var file = docFileQuanLy_(docTabQuanLy_(ss, 'File'));
  var mong = quyenMongMuon_(bang, file, emailTheoDonVi_(docTabQuanLy_(ss, 'Tài khoản')));
  var congKhai = fileCongKhai_(bang, file, docKyQuanLy_(docTabQuanLy_(ss, TAB_KY)));
  var tong = { soFile: 0, them: 0, doi: 0, go: 0, loi: [] };
  fileTrongPhamVi_(bang, file, phamVi).forEach(function (id) {
    try {
      var hienCo = docQuyenFile_(id);
      apQuyenFile_(id, chenhLechQuyen_(mong[id] || {}, hienCo), tong);
      apCongKhai_(id, chenhLechCongKhai_(!!congKhai[id], hienCo), tong);
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

/** Ghi đè tab File (5 cột); tab cũ chưa có tiêu đề cột access thì thêm. */
function ghiTabFile_(tab, dong) {
  if (String(tab.getRange(1, 5).getValue()).trim() !== COT_QUYEN_DON_VI) {
    tab.getRange(1, 5).setValue(COT_QUYEN_DON_VI).setFontWeight('bold');
  }
  ghiDeDuLieuTab_(tab, 5, dong);
}

// ---------- Action quản trị (mọi action kiểm phiên trước) ----------

/** Kiểm phiên (đúng lĩnh vực) rồi chạy viec(ss của Sheet quản lý lĩnh vực đó, phiên) dưới khoá. */
function quanTriChay_(token, viec) {
  var phien = docPhienQuanTri_(token);
  if (!phien) return { ok: false, hetPhien: true, loi: 'Phiên quản trị đã hết hạn' };
  var id = layQuanLyId_(phien.linhVuc);
  if (!id) return { ok: false, loi: 'Chưa cấu hình Sheet quản lý' };
  var khoa = LockService.getScriptLock();
  try {
    khoa.waitLock(30000);
    return viec(SpreadsheetApp.openById(id), phien);
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
    var gtBang = docTabQuanLy_(ss, 'Bảng'), caiDat = caiDatChoTrang_(gtBang);
    var phamVi = {};
    phamViQuanLy_(docTabQuanLy_(ss, 'Đơn vị')).forEach(function (pv) { phamVi[pv.unitCode] = pv.tables; });
    return {
      ok: true,
      donVi: dv.donVi.map(function (d) {
        return { unitCode: d.unitCode, unitName: d.unitName, region: d.region, role: d.role, manageTables: phamVi[d.unitCode] || [] };
      }),
      taiKhoan: docTabQuanLy_(ss, 'Tài khoản').slice(1).filter(function (r) { return r[0]; }).map(function (r) {
        return { email: chuanHoaEmail_(r[0]), unitCode: String(r[1]).trim(), role: String(r[2] || 'Nhập liệu').trim() };
      }),
      bang: docBangQuanLy_(gtBang).map(function (b) {
        return { tableCode: b.tableCode, tableName: b.tableName, caiDat: caiDat[b.tableCode] };
      }),
      giao: docFileQuanLy_(docTabQuanLy_(ss, 'File')).map(function (f) {
        return { unitCode: f.unitCode, tableCode: f.tableCode, coFile: !!f.fileId, access: f.access };
      }),
      ky: docKyQuanLy_(docTabQuanLy_(ss, TAB_KY))
    };
  });
}

/**
 * Lưu Gmail của một đơn vị; bangQuanLy (mảng mã bảng, chỉ đơn vị vai trò Quản lý báo cáo; [] = mọi
 * bảng; không gửi = giữ nguyên) ghi cột E tab Đơn vị. Soát quyền file của đơn vị + bảng vừa thêm / bỏ.
 */
function xuLyQtLuuTaiKhoan_(token, unitCode, ds, bangQuanLy) {
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
    var bangDoi = [];
    if (bangQuanLy !== undefined && bangQuanLy !== null) {
      var doi = ghiBangQuanLy_(ss, uc, bangQuanLy);
      if (doi.loi) return { ok: false, loi: doi.loi };
      bangDoi = doi.bangDoi;
    }
    ghiDeDuLieuTab_(tab, 3, dong);
    SpreadsheetApp.flush();
    return { ok: true, quyen: dongBoQuyen_(ss, { unitCodes: [uc], tableCodes: bangDoi }) };
  });
}

/** Ghi cột E (manageTables) tab Đơn vị của đơn vị Quản lý báo cáo → {bangDoi} (bảng thêm / bỏ) hoặc {loi}. */
function ghiBangQuanLy_(ss, uc, bangQuanLy) {
  var dsMaBang = docBangQuanLy_(docTabQuanLy_(ss, 'Bảng')).map(function (b) { return b.tableCode; });
  var kiem = kiemBangQuanLy_(bangQuanLy, dsMaBang);
  if (kiem.loi) return kiem;
  var tabDv = ss.getSheetByName('Đơn vị'), gt = tabDv.getDataRange().getValues();
  var dong = 0;
  for (var i = 1; i < gt.length; i++) if (String(gt[i][0]).trim() === uc) dong = i + 1;
  if (!dong) return { loi: 'Không có đơn vị ' + uc };
  if (String(gt[dong - 1][3]).trim() !== 'Quản lý báo cáo') return { loi: 'Chỉ đơn vị vai trò Quản lý báo cáo mới chọn bảng quản lý' };
  var cu = bangQuanLyHieuLuc_(phamViQuanLy_([gt[0], gt[dong - 1]])[0], dsMaBang);
  var moi = bangQuanLyHieuLuc_({ unitCode: uc, tables: kiem.tables }, dsMaBang);
  if (String(tabDv.getRange(1, 5).getValue()).trim() !== 'manageTables') tabDv.getRange(1, 5).setValue('manageTables').setFontWeight('bold');
  tabDv.getRange(dong, 5).setNumberFormat('@').setValue(kiem.tables.join(', '));
  return { bangDoi: cu.filter(function (m) { return moi.indexOf(m) < 0; })
    .concat(moi.filter(function (m) { return cu.indexOf(m) < 0; })) };
}

/** quyenDv: { unitCode: 'sua'|'xem'|'khong' } — đơn vị không có trong đó = khong. */
function xuLyQtLuuPhanQuyen_(token, tableCode, quyenDv) {
  return quanTriChay_(token, function (ss) {
    var tc = String(tableCode || '').trim();
    var coBang = docBangQuanLy_(docTabQuanLy_(ss, 'Bảng')).some(function (b) { return b.tableCode === tc; });
    if (!tc || !coBang) return { ok: false, loi: 'Không tìm thấy bảng ' + tc };
    var kiem = kiemQuyenGiao_(quyenDv);
    if (kiem.loi) return { ok: false, loi: kiem.loi };

    var tabFile = ss.getSheetByName('File');
    ghiTabFile_(tabFile, capNhatGiao_(tabFile.getDataRange().getValues(), tc, kiem.quyen).dong);
    SpreadsheetApp.flush();
    var quyen = dongBoQuyen_(ss, { tableCodes: [tc] });
    return { ok: true, quyen: quyen };
  });
}
