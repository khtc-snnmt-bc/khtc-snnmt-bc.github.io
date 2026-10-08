// ============================================================
// bcsnn · gas/KyBaoCao.js
// Vai trò  : Kỳ báo cáo — tạo tab kỳ ở mọi file đơn vị của một bảng (thiếu file
//            thì tạo file), khoá / mở khoá kỳ, tự khoá theo ngày; sổ kỳ ở tab "Kỳ" của Sheet quản lý
// Lớp      : gas — gọi bởi: Code.js, QuanLyBang.js, B04.js (thử), trigger theo giờ (tuKhoaKy)
//            · gọi: PhanQuyen.js, DangNhap.js, QuanLyBang.js (kiemMauBang_)
// Phiên bản: 0.3.1 · Cập nhật: 08/10/2026 09:16
// ============================================================
// Tab kỳ = chép tab đầu của file tổng (templateFileId), tách dòng theo mã đơn
// vị, khoá theo cài đặt bảng (KIEN-TRUC.md mục 6). Tên tab dd.mm.yyyy.
// Khoá kỳ = khoá cả tab + ẩn tab. Tab vốn đã có bảo vệ cả tab (chừa vùng nhập)
// thì vùng nhập cũ cất vào developer metadata của tab → Mở khoá trả lại đúng.
// 168 file không xong trong một lần chạy (6 phút) → mỗi lần chạy tối đa
// KY_MS_TOI_DA rồi trả `tiepTu`; trang gọi lại với batDau = tiepTu tới khi null.
// Tự khoá (thiết kế mục 7): mỗi kỳ có ngày tự khoá (tab Kỳ cột lockDate), mặc định
// = ngày `lockDay` của bảng đầu tiên sau ngày kỳ. Trigger theo giờ gọi tuKhoaKy —
// chủ dự án tự cài trong trình soạn (không dùng ScriptApp → không thêm quyền mới).

var NHAN_COT_A = 'Mã đơn vị';
var MA_MOI_DON_VI = 'all';      // cột A của mẫu ghi 'all' = dòng giao cho mọi đơn vị
var TIEN_TO_KHOA_KY = 'Khoá kỳ';
var META_KHOA_KY = 'bcsnn_khoaKy';
var TAB_KY = 'Kỳ';
var KY_MS_TOI_DA = 240000;
var TU_KHOA_TIEP = 'TU_KHOA_TIEP';   // Script Properties: chỗ dừng của lần tự khoá trước

// ---------- Hàm thuần (kiểm bằng Node: kiem-thu/kiem-gas-ky.mjs) ----------

// 'A' → 1, 'AF' → 32
function soCot_(chu) {
  return String(chu).trim().toUpperCase().split('').reduce(function (so, kyTu) {
    return so * 26 + kyTu.charCodeAt(0) - 64;
  }, 0);
}

// 1 → 'A', 32 → 'AF'
function chuCot_(so) {
  var chu = '';
  for (var n = so; n > 0; n = Math.floor((n - 1) / 26)) chu = String.fromCharCode(65 + (n - 1) % 26) + chu;
  return chu;
}

// 'C:J, L' → [3..10, 12] · '5:7,9' → [5,6,7,9] · trống → null (= không khai)
function docDanhSach_(khai, doiSo) {
  var chuoi = String(khai === undefined || khai === null ? '' : khai).trim();
  if (!chuoi) return null;
  var so = [];
  chuoi.split(',').forEach(function (phan) {
    var hai = phan.split(':').map(function (x) { return doiSo(x.trim()); });
    for (var i = Math.min(hai[0], hai[hai.length - 1]); i <= Math.max(hai[0], hai[hai.length - 1]); i++) {
      if (so.indexOf(i) < 0) so.push(i);
    }
  });
  return so.sort(function (a, b) { return a - b; });
}

function docDanhSachCot_(khai) { return docDanhSach_(khai, soCot_); }
function docDanhSachDong_(khai) { return docDanhSach_(khai, Number); }

// [3,4,5,8] → [[3,5],[8,8]]
function gomDoan_(so) {
  var doan = [];
  so.slice().sort(function (a, b) { return a - b; }).forEach(function (n) {
    var cuoi = doan[doan.length - 1];
    if (cuoi && n === cuoi[1] + 1) cuoi[1] = n; else doan.push([n, n]);
  });
  return doan;
}

function khoangSo_(dau, cuoi) {
  var so = [];
  for (var i = dau; i <= cuoi; i++) so.push(i);
  return so;
}

// Ngày kỳ → tên tab 'dd.mm.yyyy'
function tenTabKy_(ngay) {
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  return hai(ngay.getDate()) + '.' + hai(ngay.getMonth() + 1) + '.' + ngay.getFullYear();
}

/** 'yyyy-mm-dd' (ô chọn ngày) hoặc 'dd.mm.yyyy' → 'dd.mm.yyyy'; ngày không có thật → ''. */
function chuanHoaTenKy_(chuoi) {
  var s = String(chuoi || '').trim(), m, y, t, d;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { y = +m[1]; t = +m[2]; d = +m[3]; }
  else if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s))) { d = +m[1]; t = +m[2]; y = +m[3]; }
  else return '';
  var ngay = new Date(y, t - 1, d);
  if (ngay.getFullYear() !== y || ngay.getMonth() !== t - 1 || ngay.getDate() !== d || y < 2000) return '';
  return tenTabKy_(ngay);
}

/** 'dd.mm.yyyy' → số yyyymmdd để so ngày; sai dạng → 0. */
function soNgay_(ten) {
  var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(ten || ''));
  return m ? Number(m[3] + m[2] + m[1]) : 0;
}

/** Ô "Tự khoá ngày … hằng tháng" của bảng → số 1–31; trống → ''; sai → -1. */
function ngayKhoaThang_(o) {
  var s = String(o === undefined || o === null ? '' : o).trim();
  if (!s) return '';
  return /^\d{1,2}$/.test(s) && +s >= 1 && +s <= 31 ? +s : -1;
}

/**
 * Ngày tự khoá mặc định của kỳ: ngày `lockDay` đầu tiên SAU ngày kỳ (tháng thiếu
 * ngày đó thì lấy ngày cuối tháng). VD kỳ 30.09.2026, ngày 5 → 05.10.2026. Không cài → ''.
 */
function hanKhoaMacDinh_(tenKy, lockDay) {
  var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(tenKy || '')), n = ngayKhoaThang_(lockDay);
  if (!m || !(n > 0)) return '';
  var ky = new Date(+m[3], +m[2] - 1, +m[1]);
  for (var i = 0; ; i++) {
    var ngay = new Date(ky.getFullYear(), ky.getMonth() + i, Math.min(n, new Date(ky.getFullYear(), ky.getMonth() + i + 1, 0).getDate()));
    if (ngay > ky) return tenTabKy_(ngay);
  }
}

/** Kỳ đang mở đã tới ngày tự khoá (ngày tự khoá ≤ hôm nay). */
function kyDenHan_(dsKy, homNay) {
  return dsKy.filter(function (k) {
    return !k.locked && soNgay_(k.lockDate) && soNgay_(k.lockDate) <= soNgay_(homNay);
  });
}

// Dòng tiêu đề cột = dòng đầu có ô A đúng 'Mã đơn vị' (số dòng từ 1; 0 = không có)
function timDongTieuDe_(cotA) {
  for (var i = 0; i < cotA.length; i++) if (String(cotA[i]).trim() === NHAN_COT_A) return i + 1;
  return 0;
}

// Dòng dữ liệu của mẫu giữ lại ở file đơn vị: bảng gộp–tách chỉ giữ dòng có mã
// đơn vị đó hoặc 'all' (dòng chung mọi đơn vị — bảng Tổng các đơn vị)
function dongGiuLai_(cotA, dongTieuDe, maDonVi, laTachDong) {
  var giu = [];
  for (var dong = dongTieuDe + 1; dong <= cotA.length; dong++) {
    var ma = String(cotA[dong - 1]).trim();
    if (!laTachDong || ma === maDonVi || ma === MA_MOI_DON_VI) giu.push(dong);
  }
  return giu;
}

// Bảng gộp–tách: đơn vị không có dòng nào (mã của nó hay 'all') ở cột A mẫu → không
// tạo file được (Google không cho xoá hết dòng dưới tiêu đề), báo quản trị.
function loiKhongCoDong_(cotA, maDonVi) {
  var dongTieuDe = timDongTieuDe_(cotA);
  if (!dongTieuDe || dongGiuLai_(cotA, dongTieuDe, maDonVi, true).length) return '';
  return 'không có dòng nào mang mã này ở cột A file tổng — thêm dòng cho đơn vị vào file tổng, hoặc bỏ giao ở mục Phân quyền';
}

// Ánh xạ dòng mẫu → dòng file đơn vị (dòng giữ lại dồn lên ngay dưới tiêu đề)
function anhXaDong_(giuLai, dongTieuDe) {
  var anhXa = {};
  giuLai.forEach(function (dong, i) { anhXa[dong] = dongTieuDe + 1 + i; });
  return anhXa;
}

// Bảng đơn vị tự nhập dòng: cột A = một công thức, hiện mã ở dòng có nội dung
// trong cột nhập → dòng chèn thêm cũng tự có mã. Viết với ';' (vùng vi_VN).
function congThucMaDonVi_(maDonVi, inputCols, dongDau) {
  var noi = (docDanhSachCot_(inputCols) || []).filter(function (c) { return c > 1; })
    .map(function (c) { return chuCot_(c) + dongDau + ':' + chuCot_(c); }).join('&');
  return '=ARRAYFORMULA(IF(LEN(' + noi + ')=0;"";"' + maDonVi + '"))';
}

// Cài đặt bảng (một dòng tab "Bảng") → kế hoạch khoá cho tab kỳ đã tách
//   không cho thêm dòng → { kieu:'toanTab', vungMo:[{dong:[a,b], cot:[c,d]}] }
//   cho thêm dòng       → { kieu:'theoVung', cotKhoa:[{dong, cot}], dongKhoa:[[a,b]] }
//     cột khoá chỉ khoá TỚI DÒNG CUỐI, không cả cột: khoá cả cột thì chặn cả chèn
//     dòng lẫn nút "Thêm hàng" (phép thử T5). Dòng tiêu đề / dòng khoá: khoá cả dòng.
// Cột A luôn khoá. Ô nhập = giao cột nhập × dòng nhập, trừ dòng khoá.
function keHoachKhoa_(caiDat, dongTieuDe, dongCuoi, anhXa, soCot) {
  var doiDong = function (ds) {
    return ds.map(function (d) { return anhXa[d]; }).filter(function (d) { return d; });
  };
  var dongDuLieu = khoangSo_(dongTieuDe + 1, dongCuoi);
  var dongKhoaKhai = doiDong(docDanhSachDong_(caiDat.lockedRows) || []);
  var dongNhapKhai = docDanhSachDong_(caiDat.inputRows);
  var dongNhap = (dongNhapKhai ? doiDong(dongNhapKhai) : dongDuLieu).filter(function (d) {
    return d > dongTieuDe && d <= dongCuoi && dongKhoaKhai.indexOf(d) < 0;
  });
  var cotNhap = (docDanhSachCot_(caiDat.inputCols) || []).filter(function (c) { return c > 1 && c <= soCot; });
  if (!caiDat.allowAddRows) {
    var vungMo = [];
    gomDoan_(dongNhap).forEach(function (dong) {
      gomDoan_(cotNhap).forEach(function (cot) { vungMo.push({ dong: dong, cot: cot }); });
    });
    return { kieu: 'toanTab', vungMo: vungMo };
  }
  var cotKhoa = khoangSo_(1, soCot).filter(function (c) { return cotNhap.indexOf(c) < 0; });
  var dongKhoa = khoangSo_(1, dongTieuDe).concat(dongDuLieu.filter(function (d) { return dongNhap.indexOf(d) < 0; }));
  return { kieu: 'theoVung', dongKhoa: gomDoan_(dongKhoa),
    cotKhoa: gomDoan_(cotKhoa).map(function (cot) { return { dong: [dongTieuDe + 1, dongCuoi], cot: cot }; }) };
}

// Dòng tab "Bảng" → đối tượng cài đặt (ô Sheet có thể là boolean hay chữ)
function docCaiDat_(tieuDe, dong) {
  var caiDat = {};
  tieuDe.forEach(function (ten, i) { caiDat[String(ten).trim()] = dong[i]; });
  caiDat.tableCode = String(caiDat.tableCode || '').trim();
  caiDat.templateFileId = String(caiDat.templateFileId || '').trim();
  caiDat.allowAddRows = caiDat.allowAddRows === true || String(caiDat.allowAddRows).trim().toUpperCase() === 'TRUE';
  caiDat.aggregateType = String(caiDat.aggregateType || '').trim() === 'tong' ? 'tong' : 'ghep';
  if (caiDat.aggregateType === 'tong') caiDat.allowAddRows = false;   // bảng tổng: đơn vị không thêm dòng
  caiDat.noteTabs = String(caiDat.noteTabs || '').split(',')
    .map(function (t) { return t.trim(); }).filter(function (t) { return t; });
  return caiDat;
}

function laDung_(o) {
  return o === true || String(o).trim().toUpperCase() === 'TRUE';
}

/** Ô tên kỳ của tab Kỳ → 'dd.mm.yyyy' — Sheet có thể đã tự đổi chữ thành ngày. */
function tenKyTuO_(o) {
  if (Object.prototype.toString.call(o) === '[object Date]') return isNaN(o) ? '' : tenTabKy_(o);
  return String(o === undefined || o === null ? '' : o).trim();
}

/** Tab Kỳ → [{tableCode, periodName, locked, lockDate}] (lockDate cột E, '' = không tự khoá) */
function docKyQuanLy_(dsKy) {
  var kq = [];
  for (var i = 1; i < (dsKy || []).length; i++) {
    var tc = String(dsKy[i][0] || '').trim(), ten = tenKyTuO_(dsKy[i][1]);
    if (tc && ten) kq.push({ tableCode: tc, periodName: ten, locked: laDung_(dsKy[i][2]), lockDate: tenKyTuO_(dsKy[i][4]) });
  }
  return kq;
}

/** Số dòng (từ 1, tính cả tiêu đề) của kỳ trong tab Kỳ; 0 = chưa có. */
function dongKy_(dsKy, tableCode, tenKy) {
  for (var i = 1; i < (dsKy || []).length; i++) {
    if (String(dsKy[i][0]).trim() === tableCode && tenKyTuO_(dsKy[i][1]) === tenKy) return i + 1;
  }
  return 0;
}

/** Các dòng giao của một bảng trong tab File, giữ thứ tự: [{unitCode, fileId, dong}] (dong = số dòng Sheet). */
function giaoCuaBangKy_(dsFile, tableCode) {
  var kq = [];
  for (var i = 1; i < (dsFile || []).length; i++) {
    var uc = String(dsFile[i][0] || '').trim();
    if (uc && String(dsFile[i][1] || '').trim() === tableCode) {
      kq.push({ unitCode: uc, fileId: String(dsFile[i][2] || '').trim(), dong: i + 1 });
    }
  }
  return kq;
}

// ---------- Chạm Drive / Sheet ----------

function nganCongThuc_(ss) {
  return ss.getSpreadsheetLocale().indexOf('en') === 0 ? ',' : ';';
}

function dauTien_(ss, tab) {
  ss.setActiveSheet(tab);
  ss.moveActiveSheet(1);
}

function boQuyenSua_(baoVe) {
  baoVe.removeEditors(baoVe.getEditors());
  if (baoVe.canDomainEdit()) baoVe.setDomainEdit(false);
  return baoVe;
}

// Sinh tab kỳ từ tab đầu của mẫu: tách dòng, điền mã, khoá theo cài đặt bảng
function taoTabKy_(ss, mau, caiDat, maDonVi, tenKy) {
  var tab = mau.getSheets()[0].copyTo(ss).setName(tenKy);
  try {
    return dungTabKy_(ss, tab, mau, caiDat, maDonVi);
  } catch (err) {
    ss.deleteSheet(tab);   // không để lại tab dở (chưa tách, chưa khoá) — lần sau tạo lại được
    throw err;
  }
}

function dungTabKy_(ss, tab, mau, caiDat, maDonVi) {
  dauTien_(ss, tab);
  var cotA = tab.getRange(1, 1, tab.getLastRow(), 1).getValues().map(function (d) { return d[0]; });
  var dongTieuDe = timDongTieuDe_(cotA);
  if (!dongTieuDe) throw new Error('Mẫu ' + caiDat.tableCode + ': không có dòng nào ô A ghi "' + NHAN_COT_A + '"');
  var laTach = caiDat.sourceType === 'gopTach';
  // Mẫu dựng trên app: dòng trống chưa có chữ nên getLastRow không đếm → bù theo dataRows
  if (!laTach) while (cotA.length < dongTieuDe + (Number(caiDat.dataRows) || 0)) cotA.push('');
  var giuLai = dongGiuLai_(cotA, dongTieuDe, maDonVi, laTach);
  var dongXoa = khoangSo_(dongTieuDe + 1, cotA.length).filter(function (d) { return giuLai.indexOf(d) < 0; });
  gomDoan_(dongXoa).reverse().forEach(function (doan) { tab.deleteRows(doan[0], doan[1] - doan[0] + 1); });
  var dongCuoi = dongTieuDe + giuLai.length;
  if (!caiDat.allowAddRows && tab.getMaxRows() > dongCuoi) tab.deleteRows(dongCuoi + 1, tab.getMaxRows() - dongCuoi);
  var cotCuoi = mau.getSheets()[0].getLastColumn();   // bỏ cột trống thừa → khỏi phải khoá
  if (tab.getMaxColumns() > cotCuoi) tab.deleteColumns(cotCuoi + 1, tab.getMaxColumns() - cotCuoi);
  if (laTach && giuLai.length) {
    // Cột A file đơn vị: 'all' → mã đơn vị đó; bỏ danh sách chọn mã (cột A luôn khoá)
    var vungA = tab.getRange(dongTieuDe + 1, 1, giuLai.length, 1).clearDataValidations();
    vungA.setValues(vungA.getValues().map(function (d) { return [String(d[0]).trim() === MA_MOI_DON_VI ? maDonVi : d[0]]; }));
  }
  if (!laTach) {
    tab.getRange(dongTieuDe + 1, 1, Math.max(giuLai.length, 1), 1).clearDataValidations();
    tab.getRange(dongTieuDe + 1, 1).setFormula(
      congThucMaDonVi_(maDonVi, caiDat.inputCols, dongTieuDe + 1).replace(/;/g, nganCongThuc_(ss)));
  }

  var keHoach = keHoachKhoa_(caiDat, dongTieuDe, dongCuoi, anhXaDong_(giuLai, dongTieuDe), tab.getMaxColumns());
  var moTa = caiDat.tableCode + ' · ' + tab.getName();
  if (keHoach.kieu === 'toanTab') {
    var baoVe = tab.protect().setDescription('Ô cố định · ' + moTa);
    boQuyenSua_(baoVe);
    baoVe.setUnprotectedRanges(keHoach.vungMo.map(function (v) {
      return tab.getRange(v.dong[0], v.cot[0], v.dong[1] - v.dong[0] + 1, v.cot[1] - v.cot[0] + 1);
    }));
  } else {
    keHoach.cotKhoa.forEach(function (v) {
      boQuyenSua_(tab.getRange(v.dong[0], v.cot[0], v.dong[1] - v.dong[0] + 1, v.cot[1] - v.cot[0] + 1)
        .protect().setDescription('Cột khoá · ' + moTa));
    });
    keHoach.dongKhoa.forEach(function (doan) {
      boQuyenSua_(tab.getRange(doan[0] + ':' + doan[1]).protect().setDescription('Dòng khoá · ' + moTa));
    });
  }
  return { tab: tab, keHoach: keHoach, soDong: giuLai.length };
}

function chepTabChuThich_(ss, mau, caiDat) {
  caiDat.noteTabs.forEach(function (ten) {
    var goc = mau.getSheetByName(ten);
    if (!goc || ss.getSheetByName(ten)) return;
    var tab = goc.copyTo(ss).setName(ten);
    boQuyenSua_(tab.protect().setDescription('Chú thích · chỉ đọc'));
  });
}

/** File đơn vị mới `{mãBảng}_{mãĐơnVị}`, cùng thư mục với file tổng (thiết kế mục 5). */
function taoFileChoDonVi_(caiDat, unitCode) {
  var ss = SpreadsheetApp.create(caiDat.tableCode + '_' + unitCode);
  var thuMuc = DriveApp.getFileById(caiDat.templateFileId).getParents();
  if (thuMuc.hasNext()) DriveApp.getFileById(ss.getId()).moveTo(thuMuc.next());
  return ss;
}

function soTabDangHien_(ss) {
  return ss.getSheets().filter(function (t) { return !t.isSheetHidden(); }).length;
}

function metaKhoaKy_(tab) {
  return tab.getDeveloperMetadata().filter(function (m) { return m.getKey() === META_KHOA_KY; })[0] || null;
}

/** Khoá kỳ: khoá cả tab (cất vùng nhập cũ vào metadata) + ẩn. Đã khoá thì thôi. */
function khoaTabKy_(tab) {
  var baoVe = tab.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];
  if (!(baoVe && baoVe.getDescription().indexOf(TIEN_TO_KHOA_KY) === 0)) {
    var cu = { moTa: null, vungMo: [] };
    if (baoVe) {
      cu = { moTa: baoVe.getDescription(), vungMo: baoVe.getUnprotectedRanges().map(function (r) { return r.getA1Notation(); }) };
      baoVe.setUnprotectedRanges([]);
    } else {
      baoVe = tab.protect();
    }
    var meta = metaKhoaKy_(tab);
    if (meta) meta.remove();
    tab.addDeveloperMetadata(META_KHOA_KY, JSON.stringify(cu));
    boQuyenSua_(baoVe.setDescription(TIEN_TO_KHOA_KY + ' · ' + tab.getName()));
  }
  // Không ẩn được tab hiện cuối cùng của file
  if (!tab.isSheetHidden() && soTabDangHien_(tab.getParent()) > 1) tab.hideSheet();
}

/** Mở khoá kỳ: trả lại bảo vệ như trước khi khoá + hiện tab. */
function moKhoaTabKy_(tab) {
  var baoVe = tab.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];
  if (baoVe && baoVe.getDescription().indexOf(TIEN_TO_KHOA_KY) === 0) {
    var meta = metaKhoaKy_(tab);
    if (!meta) throw new Error('tab ' + tab.getName() + ' khoá theo cách cũ, không tự mở được');
    var cu = JSON.parse(meta.getValue());
    if (cu.moTa === null) {
      baoVe.remove();
    } else {
      baoVe.setDescription(cu.moTa);
      baoVe.setUnprotectedRanges(cu.vungMo.map(function (a1) { return tab.getRange(a1); }));
    }
    meta.remove();
  }
  if (tab.isSheetHidden()) tab.showSheet();
}

function tabKyQuanLy_(ss) {
  var tab = ss.getSheetByName(TAB_KY);
  if (tab) return tab;
  tab = ss.insertSheet(TAB_KY);
  tab.getRange(1, 1, 1, 5).setValues([['tableCode', 'periodName', 'locked', 'createdAt', 'lockDate']]).setFontWeight('bold');
  tab.setFrozenRows(1);
  return tab;
}

/** Ghi ngày tự khoá ('dd.mm.yyyy' hoặc '') vào cột E dòng `dong` của tab Kỳ (tab cũ thiếu tiêu đề thì thêm). */
function ghiHanKhoa_(tabKy, dong, hanKhoa) {
  if (!String(tabKy.getRange(1, 5).getValue()).trim()) tabKy.getRange(1, 5).setValue('lockDate').setFontWeight('bold');
  tabKy.getRange(dong, 5).setNumberFormat('@').setValue(hanKhoa);   // chữ — kẻo Sheet đổi thành ngày
}

function caiDatBang_(ss, tableCode) {
  var gt = docTabQuanLy_(ss, 'Bảng');
  for (var i = 1; i < gt.length; i++) {
    var cd = docCaiDat_(gt[0], gt[i]);
    if (cd.tableCode === tableCode) return cd;
  }
  return null;
}

/**
 * Tạo kỳ `tenKy` cho bảng: từ đơn vị thứ batDau trong tab File, mỗi đơn vị
 * thiếu file thì tạo file, chưa có tab kỳ thì sinh tab. Hết giờ thì trả tiepTu.
 * hanKhoa ('dd.mm.yyyy' | '' = không tự khoá | undefined = theo lockDay của bảng)
 * chỉ ghi khi kỳ mới vào sổ.
 */
function taoKy_(ss, tableCode, tenKy, batDau, hanKhoa) {
  var batDauLuc = Date.now();
  if (!tenKy) return { ok: false, loi: 'Ngày kỳ không hợp lệ' };
  var caiDat = caiDatBang_(ss, tableCode);
  if (!caiDat) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  if (!caiDat.templateFileId) return { ok: false, loi: 'Bảng chưa có file tổng (mẫu)' };
  if (!Number(batDau)) {   // lô đầu: mẫu sai thì không tạo (sinh 168 file sai rất khó dọn)
    var kiem = kiemMauBang_(ss, tableCode).kiem || [];
    if (kiem.length) return { ok: false, loi: 'Mẫu chưa đúng ' + kiem.length + ' chỗ — vào Quản lý bảng, bấm Kiểm tra bảng để xem và sửa', kiem: kiem };
  }

  var tabKy = tabKyQuanLy_(ss);
  var dsKy = tabKy.getDataRange().getValues();
  var dong = dongKy_(dsKy, tableCode, tenKy);
  if (dong && laDung_(dsKy[dong - 1][2])) return { ok: false, loi: 'Kỳ ' + tenKy + ' đang khoá — mở khoá trước' };
  var han;
  if (!dong) {
    han = hanKhoa === undefined ? hanKhoaMacDinh_(tenKy, caiDat.lockDay) : hanKhoa;
    // Không dùng appendRow: nó bỏ qua định dạng chữ, '10.11.2026' thành ngày
    dong = dsKy.length + 1;
    var moi = tabKy.getRange(dong, 1, 1, 4);
    moi.offset(0, 1, 1, 1).setNumberFormat('@');
    moi.setValues([[tableCode, tenKy, false, new Date()]]);
    ghiHanKhoa_(tabKy, dong, han);
  } else {
    han = tenKyTuO_(dsKy[dong - 1][4]);
  }

  var giao = giaoCuaBangKy_(docTabQuanLy_(ss, 'File'), tableCode);
  var tabFile = ss.getSheetByName('File');
  var mau = SpreadsheetApp.openById(caiDat.templateFileId);
  var tabMau = mau.getSheets()[0];
  var cotAMau = caiDat.sourceType === 'gopTach'
    ? tabMau.getRange(1, 1, Math.max(tabMau.getLastRow(), 1), 1).getValues().map(function (d) { return d[0]; }) : null;
  var kq = { ok: true, tenKy: tenKy, hanKhoa: han, tong: giao.length, daTao: 0, fileMoi: 0, daCo: 0, loi: [], tiepTu: null };
  var fileMoi = [];
  for (var i = Number(batDau) || 0; i < giao.length; i++) {
    if (Date.now() - batDauLuc > KY_MS_TOI_DA) { kq.tiepTu = i; break; }
    var g = giao[i];
    var khongDong = cotAMau ? loiKhongCoDong_(cotAMau, g.unitCode) : '';
    if (khongDong) { kq.loi.push(g.unitCode + ': ' + khongDong); continue; }
    try {
      var file, macDinh = null;
      if (g.fileId) {
        file = SpreadsheetApp.openById(g.fileId);
      } else {
        file = taoFileChoDonVi_(caiDat, g.unitCode);
        macDinh = file.getSheets()[0];
        tabFile.getRange(g.dong, 3, 1, 2).setValues([[file.getId(), new Date()]]);
        fileMoi.push(file.getId());
        kq.fileMoi++;
      }
      if (file.getSheetByName(tenKy)) { kq.daCo++; continue; }
      taoTabKy_(file, mau, caiDat, g.unitCode, tenKy);
      chepTabChuThich_(file, mau, caiDat);
      if (macDinh) file.deleteSheet(macDinh);
      kq.daTao++;
    } catch (err) {
      kq.loi.push(g.unitCode + ': ' + String(err.message || err));
    }
  }
  if (fileMoi.length) {
    SpreadsheetApp.flush();
    kq.quyen = dongBoQuyen_(ss, { fileIds: fileMoi });
  }
  return kq;
}

/**
 * Khoá (khoa = true) / mở khoá kỳ ở mọi file đơn vị của bảng; xong hết thì ghi sổ kỳ.
 * Mở khoá tay thì bỏ luôn ngày tự khoá — kẻo giờ sau trigger khoá lại.
 * hetGio (ms, tuỳ chọn): mốc dừng chung khi tự khoá nhiều kỳ trong một lần chạy.
 */
function khoaMoKy_(ss, tableCode, tenKy, khoa, batDau, hetGio) {
  hetGio = hetGio || Date.now() + KY_MS_TOI_DA;
  var tabKy = tabKyQuanLy_(ss);
  var dsKy = tabKy.getDataRange().getValues();
  var dong = dongKy_(dsKy, tableCode, tenKy);
  if (!dong) return { ok: false, loi: 'Không có kỳ ' + tenKy };
  var giao = giaoCuaBangKy_(docTabQuanLy_(ss, 'File'), tableCode).filter(function (g) { return g.fileId; });
  var kq = { ok: true, tenKy: tenKy, khoa: !!khoa, hanKhoa: tenKyTuO_(dsKy[dong - 1][4]),
    tong: giao.length, daLam: 0, khongCoTab: 0, loi: [], tiepTu: null };
  for (var i = Number(batDau) || 0; i < giao.length; i++) {
    if (Date.now() > hetGio) { kq.tiepTu = i; break; }
    try {
      var tab = SpreadsheetApp.openById(giao[i].fileId).getSheetByName(tenKy);
      if (!tab) { kq.khongCoTab++; continue; }
      if (khoa) khoaTabKy_(tab); else moKhoaTabKy_(tab);
      kq.daLam++;
    } catch (err) {
      kq.loi.push(giao[i].unitCode + ': ' + String(err.message || err));
    }
  }
  if (kq.tiepTu === null) {
    tabKy.getRange(dong, 3).setValue(!!khoa);
    if (!khoa && kq.hanKhoa) { ghiHanKhoa_(tabKy, dong, ''); kq.hanKhoa = ''; }
  }
  return kq;
}

/** Đặt / bỏ ('') ngày tự khoá của một kỳ đang mở. */
function datHanKhoa_(ss, tableCode, tenKy, hanKhoa) {
  var tabKy = tabKyQuanLy_(ss);
  var dsKy = tabKy.getDataRange().getValues();
  var dong = dongKy_(dsKy, tableCode, tenKy);
  if (!dong) return { ok: false, loi: 'Không có kỳ ' + tenKy };
  if (laDung_(dsKy[dong - 1][2])) return { ok: false, loi: 'Kỳ ' + tenKy + ' đã khoá' };
  ghiHanKhoa_(tabKy, dong, hanKhoa);
  return { ok: true, tenKy: tenKy, hanKhoa: hanKhoa };
}

function homNay_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy');
}

/**
 * Khoá lần lượt các kỳ tới ngày tự khoá. Hết giờ giữa chừng thì cất chỗ dừng vào
 * Script Properties — lần chạy sau (giờ sau) làm tiếp từ đó.
 */
function tuKhoaKyDenHan_(ss, homNay, hetGio) {
  var p = PropertiesService.getScriptProperties();
  var tiep = JSON.parse(p.getProperty(TU_KHOA_TIEP) || 'null');
  var denHan = kyDenHan_(docKyQuanLy_(docTabQuanLy_(ss, TAB_KY)), homNay);
  var ketQua = [];
  for (var i = 0; i < denHan.length && Date.now() < hetGio; i++) {
    var k = denHan[i];
    var batDau = tiep && tiep.tableCode === k.tableCode && tiep.periodName === k.periodName ? tiep.batDau : 0;
    var kq = khoaMoKy_(ss, k.tableCode, k.periodName, true, batDau, hetGio);
    ketQua.push({ tableCode: k.tableCode, kq: kq });
    if (kq.ok && kq.tiepTu !== null) {
      p.setProperty(TU_KHOA_TIEP, JSON.stringify({ tableCode: k.tableCode, periodName: k.periodName, batDau: kq.tiepTu }));
      return ketQua;
    }
  }
  p.deleteProperty(TU_KHOA_TIEP);
  return ketQua;
}

/**
 * TRIGGER theo giờ — chủ dự án cài một lần: trình soạn Apps Script → Trình kích hoạt →
 * Thêm → hàm tuKhoaKy · Theo thời gian · Theo giờ · Mỗi giờ. Quản trị đang chạy việc
 * (đang giữ khoá) thì bỏ lượt này, giờ sau làm.
 */
function tuKhoaKy() {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) return;
  try {
    var kq = tuKhoaKyDenHan_(SpreadsheetApp.openById(layQuanLyId_()), homNay_(), Date.now() + KY_MS_TOI_DA);
    if (kq.length) console.log('Tự khoá: ' + JSON.stringify(kq));
  } finally {
    khoa.releaseLock();
  }
}

// ---------- Action quản trị ----------

/** Ô ngày tự khoá gửi lên → {han} ('dd.mm.yyyy' | '' | undefined = không gửi) hoặc {loi}. */
function docHanKhoaGui_(hanKhoa) {
  if (hanKhoa === undefined || hanKhoa === null) return { han: undefined };
  var han = chuanHoaTenKy_(hanKhoa);
  if (!han && String(hanKhoa).trim()) return { loi: 'Ngày tự khoá không hợp lệ' };
  return { han: han };
}

function xuLyQtTaoKy_(token, tableCode, ngay, batDau, hanKhoa) {
  return quanTriChay_(token, function (ss) {
    var h = docHanKhoaGui_(hanKhoa);
    if (h.loi) return { ok: false, loi: h.loi };
    return taoKy_(ss, String(tableCode || '').trim(), chuanHoaTenKy_(ngay), batDau, h.han);
  });
}

function xuLyQtHanKhoaKy_(token, tableCode, tenKy, hanKhoa) {
  return quanTriChay_(token, function (ss) {
    var h = docHanKhoaGui_(hanKhoa === undefined ? '' : hanKhoa);
    if (h.loi) return { ok: false, loi: h.loi };
    return datHanKhoa_(ss, String(tableCode || '').trim(), chuanHoaTenKy_(tenKy), h.han);
  });
}

function xuLyQtKhoaKy_(token, tableCode, tenKy, khoa, batDau) {
  return quanTriChay_(token, function (ss) {
    return khoaMoKy_(ss, String(tableCode || '').trim(), chuanHoaTenKy_(tenKy), khoa === true, batDau);
  });
}
