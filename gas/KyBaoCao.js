// ============================================================
// bcsnn · gas/KyBaoCao.js
// Vai trò  : Kỳ báo cáo — tạo tab kỳ ở mọi file đơn vị của một bảng (thiếu file
//            thì tạo file), khoá / mở khoá kỳ; sổ kỳ ở tab "Kỳ" của Sheet quản lý
// Lớp      : gas — gọi bởi: Code.js, QuanLyBang.js, B04.js (thử) · gọi: PhanQuyen.js, DangNhap.js, QuanLyBang.js (kiemMauBang_)
// Phiên bản: 0.2.0 · Cập nhật: 07/10/2026 05:13
// ============================================================
// Tab kỳ = chép tab đầu của file tổng (templateFileId), tách dòng theo mã đơn
// vị, khoá theo cài đặt bảng (KIEN-TRUC.md mục 6). Tên tab dd.mm.yyyy.
// Khoá kỳ = khoá cả tab + ẩn tab. Tab vốn đã có bảo vệ cả tab (chừa vùng nhập)
// thì vùng nhập cũ cất vào developer metadata của tab → Mở khoá trả lại đúng.
// 168 file không xong trong một lần chạy (6 phút) → mỗi lần chạy tối đa
// KY_MS_TOI_DA rồi trả `tiepTu`; trang gọi lại với batDau = tiepTu tới khi null.

var NHAN_COT_A = 'Mã đơn vị';
var MA_MOI_DON_VI = 'all';      // cột A của mẫu ghi 'all' = dòng giao cho mọi đơn vị
var TIEN_TO_KHOA_KY = 'Khoá kỳ';
var META_KHOA_KY = 'bcsnn_khoaKy';
var TAB_KY = 'Kỳ';
var KY_MS_TOI_DA = 240000;

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

/** Tab Kỳ → [{tableCode, periodName, locked}] */
function docKyQuanLy_(dsKy) {
  var kq = [];
  for (var i = 1; i < (dsKy || []).length; i++) {
    var tc = String(dsKy[i][0] || '').trim(), ten = tenKyTuO_(dsKy[i][1]);
    if (tc && ten) kq.push({ tableCode: tc, periodName: ten, locked: laDung_(dsKy[i][2]) });
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
  tab.getRange(1, 1, 1, 4).setValues([['tableCode', 'periodName', 'locked', 'createdAt']]).setFontWeight('bold');
  tab.setFrozenRows(1);
  return tab;
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
 */
function taoKy_(ss, tableCode, tenKy, batDau) {
  var batDauLuc = Date.now();
  if (!tenKy) return { ok: false, loi: 'Ngày kỳ không hợp lệ' };
  var caiDat = caiDatBang_(ss, tableCode);
  if (!caiDat) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  if (!caiDat.templateFileId) return { ok: false, loi: 'Bảng chưa có file tổng (mẫu)' };
  if (!Number(batDau)) {   // lô đầu: mẫu sai thì không tạo (sinh 168 file sai rất khó dọn)
    var kiem = kiemMauBang_(ss, tableCode).kiem || [];
    if (kiem.length) return { ok: false, loi: 'Mẫu chưa đúng ' + kiem.length + ' chỗ — vào Quản lý bảng, bấm Kiểm mẫu để xem và sửa', kiem: kiem };
  }

  var tabKy = tabKyQuanLy_(ss);
  var dsKy = tabKy.getDataRange().getValues();
  var dong = dongKy_(dsKy, tableCode, tenKy);
  if (dong && laDung_(dsKy[dong - 1][2])) return { ok: false, loi: 'Kỳ ' + tenKy + ' đang khoá — mở khoá trước' };
  if (!dong) {
    // Không dùng appendRow: nó bỏ qua định dạng chữ, '10.11.2026' thành ngày
    var moi = tabKy.getRange(dsKy.length + 1, 1, 1, 4);
    moi.offset(0, 1, 1, 1).setNumberFormat('@');
    moi.setValues([[tableCode, tenKy, false, new Date()]]);
  }

  var giao = giaoCuaBangKy_(docTabQuanLy_(ss, 'File'), tableCode);
  var tabFile = ss.getSheetByName('File');
  var mau = SpreadsheetApp.openById(caiDat.templateFileId);
  var kq = { ok: true, tenKy: tenKy, tong: giao.length, daTao: 0, fileMoi: 0, daCo: 0, loi: [], tiepTu: null };
  var fileMoi = [];
  for (var i = Number(batDau) || 0; i < giao.length; i++) {
    if (Date.now() - batDauLuc > KY_MS_TOI_DA) { kq.tiepTu = i; break; }
    var g = giao[i];
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

/** Khoá (khoa = true) / mở khoá kỳ ở mọi file đơn vị của bảng; xong hết thì ghi sổ kỳ. */
function khoaMoKy_(ss, tableCode, tenKy, khoa, batDau) {
  var batDauLuc = Date.now();
  var tabKy = tabKyQuanLy_(ss);
  var dong = dongKy_(tabKy.getDataRange().getValues(), tableCode, tenKy);
  if (!dong) return { ok: false, loi: 'Không có kỳ ' + tenKy };
  var giao = giaoCuaBangKy_(docTabQuanLy_(ss, 'File'), tableCode).filter(function (g) { return g.fileId; });
  var kq = { ok: true, tenKy: tenKy, khoa: !!khoa, tong: giao.length, daLam: 0, khongCoTab: 0, loi: [], tiepTu: null };
  for (var i = Number(batDau) || 0; i < giao.length; i++) {
    if (Date.now() - batDauLuc > KY_MS_TOI_DA) { kq.tiepTu = i; break; }
    try {
      var tab = SpreadsheetApp.openById(giao[i].fileId).getSheetByName(tenKy);
      if (!tab) { kq.khongCoTab++; continue; }
      if (khoa) khoaTabKy_(tab); else moKhoaTabKy_(tab);
      kq.daLam++;
    } catch (err) {
      kq.loi.push(giao[i].unitCode + ': ' + String(err.message || err));
    }
  }
  if (kq.tiepTu === null) tabKy.getRange(dong, 3).setValue(!!khoa);
  return kq;
}

// ---------- Action quản trị ----------

function xuLyQtTaoKy_(token, tableCode, ngay, batDau) {
  return quanTriChay_(token, function (ss) {
    return taoKy_(ss, String(tableCode || '').trim(), chuanHoaTenKy_(ngay), batDau);
  });
}

function xuLyQtKhoaKy_(token, tableCode, tenKy, khoa, batDau) {
  return quanTriChay_(token, function (ss) {
    return khoaMoKy_(ss, String(tableCode || '').trim(), chuanHoaTenKy_(tenKy), khoa === true, batDau);
  });
}
