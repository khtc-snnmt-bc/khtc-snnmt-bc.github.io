// ============================================================
// bcsnn · gas/BanDo.js
// Vai trò  : Lĩnh vực Bản đồ (BANDO): quyền xem bản đồ của MỘT Gmail (Worker bản đồ hỏi), nút "Lấy tài khoản
//            các lĩnh vực" (chép đơn vị + Gmail của các lĩnh vực báo cáo vào Sheet "Quản lý BANDO")
// Lớp      : gas — gọi bởi: Code.js, PhanQuyen.js (damBaoCotBanDo_) · gọi: Code.js (layQuanLyId_, DS_LINH_VUC),
//            DangNhap.js (docTabQuanLy_), PhanQuyen.js (quanTriChay_, chiSoCot_), QuanTri.js (VAI_TRO_QUAN_TRI);
//            Code.js LINH_VUC_YC_
// Phiên bản: 0.1.0 · Cập nhật: 12/10/2026 23:55
// ============================================================
// Quyền (chủ dự án chốt 12/10/2026): mọi Gmail ở tab Tài khoản xem được lớp Nội bộ, trừ Gmail có dòng tích cột
// "Chặn"; Ảnh vệ tinh = Gmail thuộc đơn vị tích cột "Ảnh vệ tinh" (tab Đơn vị). Gmail vai trò Quản trị luôn được
// cả hai. Hai cột tích thẳng trong Sheet; mở trang Quản trị thì tự thêm cột (ô tích) nếu thiếu.
// Worker chỉ hỏi từng Gmail một — không bao giờ trả cả danh sách.

var LINH_VUC_BAN_DO = 'BANDO';
var COT_CHAN = 'Chặn';
var COT_VE_TINH = 'Ảnh vệ tinh';

// ---------- Hàm thuần (kiểm bằng Node: kiem-thu/kiem-gas-ban-do.mjs) ----------

/** Gmail không phân biệt hoa/thường, dấu chấm, đuôi +nhãn — như Worker (bando/worker/quyen.mjs chuanHoaEmail). */
function chuanHoaGmail_(email) {
  var e = String(email || '').trim().toLowerCase(), at = e.lastIndexOf('@');
  if (at < 1) return e;
  var tren = e.slice(0, at), mien = e.slice(at + 1);
  if (mien === 'gmail.com' || mien === 'googlemail.com') {
    mien = 'gmail.com';
    tren = tren.split('+')[0].replace(/\./g, '');
  }
  return tren + '@' + mien;
}

function laDaTich_(o) {
  return o === true || String(o).trim().toUpperCase() === 'TRUE';
}

/** Quyền bản đồ của một Gmail. dsTaiKhoan, dsDonVi: dòng tab (kèm tiêu đề) → { noiBo, veTinh } */
function quyenBanDo_(dsTaiKhoan, dsDonVi, email) {
  var em = chuanHoaGmail_(email), khong = { noiBo: false, veTinh: false };
  if (!em || !dsTaiKhoan || dsTaiKhoan.length < 2) return khong;
  var cChan = chiSoCot_(dsTaiKhoan[0], COT_CHAN);
  var donVi = [], chan = false, quanTri = false;
  for (var i = 1; i < dsTaiKhoan.length; i++) {
    var r = dsTaiKhoan[i];
    if (chuanHoaGmail_(r[0]) !== em) continue;
    if (String(r[2] || '').trim() === VAI_TRO_QUAN_TRI) quanTri = true;
    if (cChan >= 0 && laDaTich_(r[cChan])) chan = true;
    donVi.push(String(r[1] || '').trim());
  }
  if (quanTri) return { noiBo: true, veTinh: true };
  if (!donVi.length || chan) return khong;
  var cVt = chiSoCot_((dsDonVi || [])[0], COT_VE_TINH);
  var veTinh = cVt >= 0 && dsDonVi.slice(1).some(function (r) {
    return laDaTich_(r[cVt]) && donVi.indexOf(String(r[0] || '').trim()) >= 0;
  });
  return { noiBo: true, veTinh: veTinh };
}

/**
 * Gộp đơn vị + Gmail các lĩnh vực khác vào Bản đồ. Đơn vị TRÙNG TÊN HOÀN TOÀN coi là một (dùng mã của Bản đồ);
 * đơn vị mới giữ mã gốc (trùng mã đơn vị khác tên → thêm đuôi .<lĩnh vực>). Gmail đã có ở Bản đồ (ở bất kỳ
 * đơn vị nào) không thêm lại; Gmail mới vai trò Nhập liệu. Dòng cũ (kể cả dòng Chặn) giữ nguyên.
 * nguon: [{ ma, donVi: dòng tab Đơn vị, taiKhoan: dòng tab Tài khoản }] (kèm tiêu đề)
 * @returns {{donViMoi: Array<Array>, taiKhoanMoi: Array<Array>}} dòng thêm vào cuối tab Đơn vị / Tài khoản
 */
function gopTaiKhoanLinhVuc_(dvBanDo, tkBanDo, nguon) {
  var maTheoTen = {}, coMa = {}, coGmail = {}, donViMoi = [], taiKhoanMoi = [];
  (dvBanDo || []).slice(1).forEach(function (r) {
    var ma = String(r[0] || '').trim();
    if (!ma) return;
    coMa[ma] = true;
    var ten = String(r[1] || '').trim() || ma;
    if (!maTheoTen[ten]) maTheoTen[ten] = ma;
  });
  (tkBanDo || []).slice(1).forEach(function (r) { var e = chuanHoaGmail_(r[0]); if (e) coGmail[e] = true; });
  (nguon || []).forEach(function (lv) {
    var doiMa = {};
    (lv.donVi || []).slice(1).forEach(function (r) {
      var ma = String(r[0] || '').trim(), ten = String(r[1] || '').trim() || ma;
      if (!ma) return;
      if (!maTheoTen[ten]) {
        var moi = ma;
        for (var n = 1; coMa[moi]; n++) moi = ma + '.' + lv.ma + (n > 1 ? n : '');
        coMa[moi] = true;
        maTheoTen[ten] = moi;
        donViMoi.push([moi, ten, String(r[2] || '').trim(), 'Đơn vị báo cáo']);
      }
      doiMa[ma] = maTheoTen[ten];
    });
    (lv.taiKhoan || []).slice(1).forEach(function (r) {
      var goc = String(r[0] || '').trim().toLowerCase(), e = chuanHoaGmail_(goc), ma = doiMa[String(r[1] || '').trim()];
      if (!e || !ma || coGmail[e]) return;
      coGmail[e] = true;
      taiKhoanMoi.push([goc, ma, 'Nhập liệu']);
    });
  });
  return { donViMoi: donViMoi, taiKhoanMoi: taiKhoanMoi };
}

// ---------- Chạm Sheet ----------

/** Thêm cột ô tích "Chặn" (tab Tài khoản) và "Ảnh vệ tinh" (tab Đơn vị) nếu chưa có. */
function damBaoCotBanDo_(ss) {
  [['Tài khoản', COT_CHAN, 4], ['Đơn vị', COT_VE_TINH, 6]].forEach(function (x) {
    var tab = ss.getSheetByName(x[0]);
    if (!tab) return;
    var tieuDe = tab.getRange(1, 1, 1, Math.max(tab.getLastColumn(), 1)).getValues()[0];
    if (chiSoCot_(tieuDe, x[1]) >= 0) return;
    var cot = Math.max(tab.getLastColumn() + 1, x[2]);
    tab.getRange(1, cot).setValue(x[1]).setFontWeight('bold');
    // chỉ đặt kiểu ô tích (không ghi giá trị) → ô trống hiện ô chưa tích, dòng cuối vẫn tính theo dữ liệu thật
    tab.getRange(2, cot, Math.max(tab.getMaxRows() - 1, 1), 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  });
}

function themDongCuoi_(tab, dong) {
  if (!dong.length) return;
  tab.getRange(tab.getLastRow() + 1, 1, dong.length, dong[0].length).setNumberFormat('@').setValues(dong);
}

/** Worker bản đồ hỏi quyền của một Gmail (action công khai, chỉ lĩnh vực Bản đồ). */
function xuLyBanDoQuyen_(quanLyId, email) {
  if (LINH_VUC_YC_ !== LINH_VUC_BAN_DO || !quanLyId) return { ok: false, loi: 'Chỉ dùng cho lĩnh vực Bản đồ' };
  try {
    var ss = SpreadsheetApp.openById(quanLyId);
    var q = quyenBanDo_(docTabQuanLy_(ss, 'Tài khoản'), docTabQuanLy_(ss, 'Đơn vị'), email);
    return { ok: true, noiBo: q.noiBo, veTinh: q.veTinh };
  } catch (err) {
    return { ok: false, loi: 'Lỗi đọc quyền: ' + String(err) };
  }
}

/** Nút "Lấy tài khoản các lĩnh vực" (Quản trị của Bản đồ, mục Tài khoản). */
function xuLyQtLayTaiKhoanLinhVuc_(token) {
  return quanTriChay_(token, function (ss, phien) {
    if (phien.linhVuc !== LINH_VUC_BAN_DO) return { ok: false, loi: 'Chỉ dùng cho lĩnh vực Bản đồ' };
    var nguon = [];
    DS_LINH_VUC.forEach(function (lv) {
      var id = lv === LINH_VUC_BAN_DO ? '' : layQuanLyId_(lv);
      if (!id) return;
      var s = SpreadsheetApp.openById(id);
      nguon.push({ ma: lv, donVi: docTabQuanLy_(s, 'Đơn vị'), taiKhoan: docTabQuanLy_(s, 'Tài khoản') });
    });
    var gop = gopTaiKhoanLinhVuc_(docTabQuanLy_(ss, 'Đơn vị'), docTabQuanLy_(ss, 'Tài khoản'), nguon);
    themDongCuoi_(ss.getSheetByName('Đơn vị'), gop.donViMoi);
    themDongCuoi_(ss.getSheetByName('Tài khoản'), gop.taiKhoanMoi);
    SpreadsheetApp.flush();
    return { ok: true, soDonVi: gop.donViMoi.length, soGmail: gop.taiKhoanMoi.length };
  });
}
