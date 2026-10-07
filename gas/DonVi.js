// ============================================================
// bcsnn · gas/DonVi.js
// Vai trò  : Thêm đơn vị vào tab Đơn vị của Sheet quản lý (kiểm mã, ghi dòng mới)
// Lớp      : gas — gọi bởi: Code.js · gọi: PhanQuyen.js (quanTriChay_), QuanLyBang.js (capNhatChonMaMau_, maDonViCo_, caiDatBang_)
// Phiên bản: 0.1.0 · Cập nhật: 07/10/2026 12:20
// ============================================================
// Tab Đơn vị: unitCode | unitName | region | role. Mã không dấu, không đổi sau khi
// dùng (tab File / Tài khoản / cột A file tổng tham chiếu theo mã).

var VAI_TRO_DON_VI = ['Đơn vị báo cáo', 'Quản lý báo cáo', 'Quản trị'];

// ---------- Hàm thuần (kiểm bằng Node: kiem-thu/kiem-gas-don-vi.mjs) ----------

/**
 * Kiểm đơn vị mới gửi từ app → {donVi} đã chuẩn hoá hoặc {loi}.
 * @param {Array<Array>} gtDonVi — tab Đơn vị kèm tiêu đề
 */
function kiemDonViMoi_(ma, ten, khuVuc, vaiTro, gtDonVi) {
  ma = String(ma || '').trim();
  ten = String(ten || '').trim().replace(/\s+/g, ' ');
  khuVuc = String(khuVuc || '').trim();
  vaiTro = String(vaiTro || VAI_TRO_DON_VI[0]).trim();
  if (!/^[A-Za-z0-9_.]{2,40}$/.test(ma)) {
    return { loi: 'Mã đơn vị chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới (2–40 ký tự), ví dụ BQLDA.BinhThoi' };
  }
  if (ma.toLowerCase() === 'all') return { loi: 'Mã "all" dành riêng cho "mọi đơn vị" — chọn mã khác' };
  if (!ten) return { loi: 'Chưa ghi tên đơn vị' };
  if (VAI_TRO_DON_VI.indexOf(vaiTro) < 0) return { loi: 'Vai trò "' + vaiTro + '" không hợp lệ' };
  var trung = (gtDonVi || []).slice(1).filter(function (r) {
    return String(r[0]).trim().toLowerCase() === ma.toLowerCase() ||
      String(r[1]).trim().replace(/\s+/g, ' ').toLowerCase() === ten.toLowerCase();
  })[0];
  if (trung) return { loi: 'Đơn vị "' + String(trung[0]).trim() + ' — ' + String(trung[1]).trim() + '" đã có' };
  return { donVi: { unitCode: ma, unitName: ten, region: khuVuc, role: vaiTro } };
}

// ---------- Chạm Sheet ----------

/** Thêm một dòng vào tab Đơn vị; đặt lại danh sách chọn mã ở file tổng các bảng Sở giao dòng. */
function themDonVi_(ss, ma, ten, khuVuc, vaiTro) {
  var tab = ss.getSheetByName('Đơn vị');
  if (!tab) return { ok: false, loi: 'Không tìm thấy tab "Đơn vị" trong Sheet quản lý' };
  var kiem = kiemDonViMoi_(ma, ten, khuVuc, vaiTro, tab.getDataRange().getValues());
  if (kiem.loi) return { ok: false, loi: kiem.loi };
  var d = kiem.donVi;
  var dong = Math.max(tab.getLastRow(), 1) + 1;
  tab.getRange(dong, 1, 1, 4).setNumberFormat('@').setValues([[d.unitCode, d.unitName, d.region, d.role]]);
  SpreadsheetApp.flush();

  // Cột A file tổng chỉ cho chọn mã trong danh mục → cập nhật để chọn được mã mới
  var dsMa = maDonViCo_(ss), loi = [];
  docBangQuanLy_(docTabQuanLy_(ss, 'Bảng')).forEach(function (b) {
    var cd = caiDatBang_(ss, b.tableCode);
    if (!cd || !cd.templateFileId || cd.sourceType !== 'gopTach') return;
    try { capNhatChonMaMau_(cd.templateFileId, dsMa); } catch (err) { loi.push(b.tableCode + ': ' + String(err.message || err)); }
  });
  return { ok: true, moi: d, loiCapNhatMau: loi };
}

function xuLyQtThemDonVi_(token, ma, ten, khuVuc, vaiTro) {
  return quanTriChay_(token, function (ss) { return themDonVi_(ss, ma, ten, khuVuc, vaiTro); });
}
