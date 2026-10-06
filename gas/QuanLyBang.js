// ============================================================
// bcsnn · gas/QuanLyBang.js
// Vai trò  : Quản lý bảng — dựng file tổng (bảng mẫu) từ khai báo cột trên app,
//            lưu cài đặt bảng (tab "Bảng"), kiểm mẫu theo quy ước thiết kế 5.1
// Lớp      : gas — gọi bởi: Code.js, PhanQuyen.js, B04.js (thử) · gọi: KyBaoCao.js, PhanQuyen.js, DangNhap.js
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 22:47
// ============================================================
// Mẫu dựng trên app: dòng 1 tên bảng, dòng 2 tiêu đề (A2 = 'Mã đơn vị'), dữ
// liệu từ dòng 3, sẵn `dataRows` dòng. Công thức khai cho dòng 3, app chép xuống.
// File tổng nằm trong thư mục con tên mã bảng, cạnh Sheet quản lý — file đơn
// vị tạo sau cũng vào đó (taoFileChoDonVi_). Bảng "Sở giao dòng": app dựng
// khung, quản trị điền dòng (mã đơn vị ở cột A) trong file tổng rồi Kiểm mẫu.
// Sửa mẫu sau khi đã tạo kỳ thì tab kỳ đã sinh không đổi.

var MAU_DONG_DAU = 3;
var MAU_DONG_SAN = 20;
var MAU_COT_TOI_DA = 60;
var MAU_DONG_TOI_DA = 500;
var KIEU_COT_NHAP = ['chu', 'so', 'ngay', 'chon'];
var KIEU_COT_HOP_LE = KIEU_COT_NHAP.concat(['congThuc']);
var CACH_NHAP_DONG = ['docLap', 'gopTach'];
var LOI_CONG_THUC = ['#ERROR!', '#NAME?', '#REF!', '#N/A'];
// Cột chữ trong tab Bảng — đặt định dạng chữ kẻo Sheet đổi '5:7' thành giờ
var COT_BANG_CHU = ['inputCols', 'inputRows', 'lockedRows', 'noteTabs', 'managerUnits'];
var CAI_DAT_SUA_DUOC = ['tableName', 'group', 'sourceType', 'inputCols', 'inputRows', 'lockedRows',
  'allowAddRows', 'noteTabs', 'dataRows'];

// ---------- Hàm thuần (kiểm bằng Node: kiem-thu/kiem-gas-bang.mjs) ----------

function hopLeDsCot_(s) {
  return /^\s*[A-Za-z]{1,3}(\s*:\s*[A-Za-z]{1,3})?(\s*,\s*[A-Za-z]{1,3}(\s*:\s*[A-Za-z]{1,3})?)*\s*$/.test(s);
}

function hopLeDsDong_(s) {
  return /^\s*\d{1,5}(\s*:\s*\d{1,5})?(\s*,\s*\d{1,5}(\s*:\s*\d{1,5})?)*\s*$/.test(s);
}

/** Cột kiểu nhập → 'B:C, E' (cột A là Mã đơn vị, cột khai thứ i là cột i + 2). */
function cotNhapTuKhai_(dsCot) {
  var so = [];
  dsCot.forEach(function (c, i) { if (KIEU_COT_NHAP.indexOf(c.kieu) >= 0) so.push(i + 2); });
  return gomDoan_(so).map(function (d) {
    return d[0] === d[1] ? chuCot_(d[0]) : chuCot_(d[0]) + ':' + chuCot_(d[1]);
  }).join(', ');
}

function soDongSan_(o, macDinh) {
  var s = String(o === undefined || o === null ? '' : o).trim();
  if (!s) return macDinh;
  var n = Number(s);
  return n === Math.floor(n) && n >= 1 && n <= MAU_DONG_TOI_DA ? n : -1;
}

/**
 * Kiểm khai báo bảng mới gửi từ app → {bang} đã chuẩn hoá hoặc {loi}.
 * @param {Object} kb — {tableCode, tableName, group, sourceType, allowAddRows, dataRows, cot: [{ten, kieu, congThuc, luaChon}]}
 * @param {Array<string>} dsMaCo — mã bảng đã có
 */
function kiemKhaiBangMoi_(kb, dsMaCo) {
  kb = kb || {};
  var ma = String(kb.tableCode || '').trim();
  if (!/^[a-z0-9_]{2,40}$/.test(ma)) return { loi: 'Mã bảng chỉ gồm chữ thường không dấu, số, dấu _ (2–40 ký tự)' };
  if ((dsMaCo || []).some(function (m) { return String(m).toLowerCase() === ma; })) return { loi: 'Mã bảng "' + ma + '" đã có' };
  var ten = String(kb.tableName || '').trim();
  if (!ten) return { loi: 'Chưa ghi tên bảng' };
  var cach = String(kb.sourceType || '');
  if (CACH_NHAP_DONG.indexOf(cach) < 0) return { loi: 'Cách nhập dòng không hợp lệ' };
  var soDong = soDongSan_(kb.dataRows, MAU_DONG_SAN);
  if (soDong < 0) return { loi: 'Số dòng sẵn phải là số nguyên từ 1 đến ' + MAU_DONG_TOI_DA };
  if (!Array.isArray(kb.cot) || !kb.cot.length) return { loi: 'Bảng chưa có cột nào' };
  if (kb.cot.length > MAU_COT_TOI_DA) return { loi: 'Tối đa ' + MAU_COT_TOI_DA + ' cột' };

  var cot = [];
  for (var i = 0; i < kb.cot.length; i++) {
    var c = kb.cot[i] || {}, chu = chuCot_(i + 2);
    var tenCot = String(c.ten || '').trim(), kieu = String(c.kieu || '');
    if (!tenCot) return { loi: 'Cột ' + chu + ': chưa ghi tên cột' };
    if (KIEU_COT_HOP_LE.indexOf(kieu) < 0) return { loi: 'Cột ' + chu + ': kiểu cột không hợp lệ' };
    var moi = { ten: tenCot, kieu: kieu };
    if (kieu === 'congThuc') {
      moi.congThuc = String(c.congThuc || '').trim();
      if (moi.congThuc.charAt(0) !== '=') return { loi: 'Cột ' + chu + ': công thức phải bắt đầu bằng dấu =' };
    }
    if (kieu === 'chon') {
      moi.luaChon = tachDsMa_(c.luaChon);
      if (!moi.luaChon.length) return { loi: 'Cột ' + chu + ': chưa ghi các lựa chọn (cách nhau dấu phẩy)' };
    }
    cot.push(moi);
  }
  var inputCols = cotNhapTuKhai_(cot);
  if (!inputCols) return { loi: 'Bảng phải có ít nhất một cột cho đơn vị nhập (không phải công thức)' };
  return { bang: {
    tableCode: ma, tableName: ten, group: String(kb.group || '').trim(), sourceType: cach,
    allowAddRows: kb.allowAddRows === true, dataRows: soDong, inputCols: inputCols, cot: cot
  } };
}

/** Kiểm phần cài đặt sửa trên app → {caiDat} chuẩn hoá (chỉ khoá sửa được) hoặc {loi}. */
function kiemCaiDatSua_(cd) {
  cd = cd || {};
  var kq = {};
  kq.tableName = String(cd.tableName || '').trim();
  if (!kq.tableName) return { loi: 'Chưa ghi tên bảng' };
  kq.group = String(cd.group || '').trim();
  kq.sourceType = String(cd.sourceType || '');
  if (CACH_NHAP_DONG.indexOf(kq.sourceType) < 0) return { loi: 'Cách nhập dòng không hợp lệ' };
  kq.inputCols = String(cd.inputCols || '').trim().toUpperCase();
  if (!hopLeDsCot_(kq.inputCols)) return { loi: 'Cột được nhập ghi chữ cột, ví dụ C:J, L' };
  kq.inputRows = String(cd.inputRows || '').trim();
  if (kq.inputRows && !hopLeDsDong_(kq.inputRows)) return { loi: 'Dòng được nhập ghi số dòng, ví dụ 5:20, 25' };
  kq.lockedRows = String(cd.lockedRows || '').trim();
  if (kq.lockedRows && !hopLeDsDong_(kq.lockedRows)) return { loi: 'Dòng khoá ghi số dòng, ví dụ 5, 9:10' };
  kq.allowAddRows = cd.allowAddRows === true;
  kq.noteTabs = tachDsMa_(cd.noteTabs).join(', ');
  var soDong = soDongSan_(cd.dataRows, '');
  if (soDong === -1) return { loi: 'Số dòng sẵn phải là số nguyên từ 1 đến ' + MAU_DONG_TOI_DA };
  kq.dataRows = soDong;
  return { caiDat: kq };
}

function loiMau_(cho, loi, cach) {
  return { cho: cho, loi: loi, cach: cach };
}

/** [5,6,7,9] → '5–7, 9' (để báo) */
function vietDsDong_(ds) {
  return gomDoan_(ds).map(function (d) { return d[0] === d[1] ? String(d[0]) : d[0] + '–' + d[1]; }).join(', ');
}

/**
 * Kiểm file tổng theo quy ước 5.1 + cài đặt bảng.
 * @param {{cotA: Array, soCot: number, tenTab: Array<string>, oLoi: Array<{a1, giaTri}>}} m — đọc từ file tổng
 * @param {Object} caiDat — docCaiDat_ (noteTabs là mảng)
 * @param {Array<string>} dsMaDonVi
 * @returns {Array<{cho, loi, cach}>} rỗng = hợp lệ
 */
function kiemMau_(m, caiDat, dsMaDonVi) {
  var loi = [];
  var dongTieuDe = timDongTieuDe_(m.cotA);
  if (!dongTieuDe) {
    return [loiMau_('Tab đầu', 'Không có dòng nào ô cột A ghi "' + NHAN_COT_A + '"',
      'Ghi đúng chữ ' + NHAN_COT_A + ' vào ô cột A của dòng tiêu đề cột')];
  }
  var laTach = caiDat.sourceType === 'gopTach';
  if (CACH_NHAP_DONG.indexOf(caiDat.sourceType) < 0) {
    loi.push(loiMau_('Cài đặt', 'Chưa chọn cách nhập dòng', 'Chọn "Đơn vị tự nhập dòng" hoặc "Sở giao dòng sẵn"'));
  }
  var dongCuoi = m.cotA.length;
  if (!laTach) dongCuoi = Math.max(dongCuoi, dongTieuDe + (Number(caiDat.dataRows) || 0));

  var khaiCot = String(caiDat.inputCols || '').trim();
  if (!khaiCot) {
    loi.push(loiMau_('Cột được nhập', 'Chưa khai', 'Ghi các cột đơn vị được nhập, ví dụ C:J, L'));
  } else if (!hopLeDsCot_(khaiCot)) {
    loi.push(loiMau_('Cột được nhập', '"' + khaiCot + '" không đúng dạng', 'Ghi chữ cột, ví dụ C:J, L'));
  } else {
    var cotNhap = docDanhSachCot_(khaiCot);
    if (cotNhap.indexOf(1) >= 0) loi.push(loiMau_('Cột được nhập', 'Có cột A', 'Bỏ A — cột Mã đơn vị luôn khoá'));
    var ngoai = cotNhap.filter(function (c) { return c > m.soCot; });
    if (ngoai.length) {
      loi.push(loiMau_('Cột được nhập', 'Cột ' + ngoai.map(chuCot_).join(', ') + ' nằm ngoài bảng',
        'Bảng chỉ tới cột ' + chuCot_(m.soCot) + ' — bỏ cột thừa hoặc thêm cột vào mẫu'));
    }
  }

  [['inputRows', 'Dòng được nhập'], ['lockedRows', 'Dòng khoá']].forEach(function (k) {
    var khai = String(caiDat[k[0]] || '').trim();
    if (!khai) return;
    if (!hopLeDsDong_(khai)) { loi.push(loiMau_(k[1], '"' + khai + '" không đúng dạng', 'Ghi số dòng, ví dụ 5:20, 25')); return; }
    var sai = docDanhSachDong_(khai).filter(function (d) { return d <= dongTieuDe || d > dongCuoi; });
    if (sai.length) {
      loi.push(loiMau_(k[1], 'Dòng ' + vietDsDong_(sai) + ' không phải dòng dữ liệu',
        'Dữ liệu của mẫu từ dòng ' + (dongTieuDe + 1) + ' tới dòng ' + dongCuoi));
    }
  });

  var coMa = [], laMa = {}, maSai = {};
  for (var d = dongTieuDe + 1; d <= m.cotA.length; d++) {
    var ma = String(m.cotA[d - 1] === undefined || m.cotA[d - 1] === null ? '' : m.cotA[d - 1]).trim();
    if (!ma) continue;
    coMa.push(d);
    laMa[ma] = true;
    if ((dsMaDonVi || []).indexOf(ma) < 0) (maSai[ma] = maSai[ma] || []).push(d);
  }
  if (laTach) {
    if (!coMa.length) {
      loi.push(loiMau_('Cột A', 'Chưa có dòng nào ghi mã đơn vị',
        'Bảng Sở giao dòng: ghi mã đơn vị vào cột A từng dòng giao cho đơn vị đó'));
    }
    Object.keys(maSai).forEach(function (ma) {
      loi.push(loiMau_('Cột A dòng ' + vietDsDong_(maSai[ma]), 'Mã "' + ma + '" không có trong danh mục đơn vị',
        'Sửa cho đúng mã ở tab Đơn vị của Sheet quản lý'));
    });
  } else if (coMa.length) {
    loi.push(loiMau_('Cột A dòng ' + vietDsDong_(coMa), 'Bảng đơn vị tự nhập dòng mà cột A đã có chữ',
      'Xoá các ô đó — app tự điền mã đơn vị'));
  } else if (dongCuoi <= dongTieuDe) {
    loi.push(loiMau_('Mẫu', 'Chưa có dòng dữ liệu nào', 'Ghi Số dòng sẵn (ví dụ 20)'));
  }

  (caiDat.noteTabs || []).forEach(function (ten) {
    if ((m.tenTab || []).indexOf(ten) < 0) {
      loi.push(loiMau_('Tab chú thích', 'Không có tab "' + ten + '"', 'Sửa tên cho khớp tên tab trong file tổng'));
    } else if (m.tenTab[0] === ten) {
      loi.push(loiMau_('Tab chú thích', '"' + ten + '" đang là tab đầu', 'Tab đầu là bảng nhập — chuyển tab chú thích ra sau'));
    }
  });

  (m.oLoi || []).forEach(function (o) {
    loi.push(loiMau_('Ô ' + o.a1, 'Công thức báo ' + o.giaTri,
      'Sửa công thức trong file tổng (vùng tiếng Việt ngăn đối số bằng dấu ;)'));
  });
  return loi;
}

/** Giá trị cài đặt → mảng một dòng theo thứ tự tiêu đề tab Bảng (giữ ô cũ ở cột không có trong giaTri). */
function dongBangMoi_(tieuDe, cu, giaTri) {
  return tieuDe.map(function (ten, i) {
    ten = String(ten).trim();
    return ten in giaTri ? giaTri[ten] : (cu ? cu[i] : '');
  });
}

// ---------- Chạm Drive / Sheet ----------

/** Thư mục con tên mã bảng, cạnh Sheet quản lý (đã có thì dùng lại). */
function thuMucBang_(ss, tableCode) {
  var cha = DriveApp.getFileById(ss.getId()).getParents();
  var goc = cha.hasNext() ? cha.next() : DriveApp.getRootFolder();
  var co = goc.getFoldersByName(tableCode);
  return co.hasNext() ? co.next() : goc.createFolder(tableCode);
}

/** Dựng file tổng `{mãBảng}_TONG` theo khai báo đã kiểm. */
function dungFileTong_(ss, bang) {
  var file = SpreadsheetApp.create(bang.tableCode + '_TONG');
  DriveApp.getFileById(file.getId()).moveTo(thuMucBang_(ss, bang.tableCode));
  var tab = file.getSheets()[0].setName('Mẫu');
  var soCot = bang.cot.length + 1, dongCuoi = MAU_DONG_DAU + bang.dataRows - 1, ngan = nganCongThuc_(file);

  if (tab.getMaxColumns() < soCot) tab.insertColumnsAfter(tab.getMaxColumns(), soCot - tab.getMaxColumns());
  if (tab.getMaxColumns() > soCot) tab.deleteColumns(soCot + 1, tab.getMaxColumns() - soCot);
  if (tab.getMaxRows() > dongCuoi) tab.deleteRows(dongCuoi + 1, tab.getMaxRows() - dongCuoi);

  tab.getRange(1, 1).setValue(bang.tableName).setFontWeight('bold').setFontSize(13);
  tab.getRange(MAU_DONG_DAU - 1, 1, 1, soCot)
    .setValues([[NHAN_COT_A].concat(bang.cot.map(function (c) { return c.ten; }))])
    .setFontWeight('bold').setBackground('#e3f1e8').setWrap(true)
    .setVerticalAlignment('middle').setHorizontalAlignment('center');
  tab.getRange(MAU_DONG_DAU - 1, 1, dongCuoi - MAU_DONG_DAU + 2, soCot)
    .setBorder(true, true, true, true, true, true, '#b7c9bd', SpreadsheetApp.BorderStyle.SOLID);
  tab.getRange(MAU_DONG_DAU, 1, bang.dataRows, 1).setBackground('#f3f4f3');
  tab.setColumnWidth(1, 140);
  tab.setColumnWidths(2, soCot - 1, 160);
  tab.setFrozenRows(MAU_DONG_DAU - 1);

  bang.cot.forEach(function (c, i) {
    var vung = tab.getRange(MAU_DONG_DAU, i + 2, bang.dataRows, 1);
    if (c.kieu === 'chu') vung.setNumberFormat('@');
    if (c.kieu === 'so') vung.setNumberFormat('#,##0.##');
    if (c.kieu === 'ngay') {
      vung.setNumberFormat('dd/mm/yyyy')
        .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
    }
    if (c.kieu === 'chon') {
      vung.setDataValidation(SpreadsheetApp.newDataValidation()
        .requireValueInList(c.luaChon, true).setAllowInvalid(false).build());
    }
    if (c.kieu === 'congThuc') {
      vung.setBackground('#f3f4f3');
      var dau = vung.getCell(1, 1).setFormula(c.congThuc.replace(/;/g, ngan));
      if (bang.dataRows > 1) dau.copyTo(vung.offset(1, 0, bang.dataRows - 1, 1));
    }
  });
  SpreadsheetApp.flush();
  return file;
}

/** Đọc file tổng để kiểm: cột A, số cột, tên tab, ô công thức lỗi (tối đa 10). */
function docMau_(file) {
  var tab = file.getSheets()[0];
  var soDong = Math.max(tab.getLastRow(), 1), soCot = Math.max(tab.getLastColumn(), 1);
  var hien = tab.getRange(1, 1, soDong, soCot).getDisplayValues();
  var oLoi = [];
  for (var r = 0; r < hien.length && oLoi.length < 10; r++) {
    for (var c = 0; c < hien[r].length && oLoi.length < 10; c++) {
      if (LOI_CONG_THUC.indexOf(hien[r][c]) >= 0) oLoi.push({ a1: chuCot_(c + 1) + (r + 1), giaTri: hien[r][c] });
    }
  }
  return {
    cotA: tab.getRange(1, 1, soDong, 1).getValues().map(function (d) { return d[0]; }),
    soCot: soCot,
    tenTab: file.getSheets().map(function (t) { return t.getName(); }),
    oLoi: oLoi
  };
}

function maDonViCo_(ss) {
  var dv = xuLyLayDonVi_(ss.getId());
  return dv.ok ? dv.donVi.map(function (d) { return d.unitCode; }) : [];
}

/** Kiểm file tổng của một bảng theo cài đặt hiện có ở tab Bảng. */
function kiemMauBang_(ss, tableCode) {
  var caiDat = caiDatBang_(ss, tableCode);
  if (!caiDat) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  if (!caiDat.templateFileId) return { ok: true, kiem: [loiMau_('File tổng', 'Bảng chưa có file tổng', 'Tạo bảng mới trên app hoặc tải mẫu lên')] };
  return { ok: true, kiem: kiemMau_(docMau_(SpreadsheetApp.openById(caiDat.templateFileId)), caiDat, maDonViCo_(ss)) };
}

/** Ghi (thêm hoặc sửa) dòng của tableCode ở tab Bảng; thiếu cột thì thêm tiêu đề. */
function ghiCaiDatBang_(ss, tableCode, giaTri) {
  var tab = ss.getSheetByName('Bảng');
  var gt = tab.getDataRange().getValues();
  var td = gt[0].map(function (o) { return String(o).trim(); });
  Object.keys(giaTri).forEach(function (k) {
    if (td.indexOf(k) < 0) {
      td.push(k);
      tab.getRange(1, td.length).setValue(k).setFontWeight('bold');
    }
  });
  var cMa = td.indexOf('tableCode'), dong = 0;
  for (var i = 1; i < gt.length; i++) if (String(gt[i][cMa]).trim() === tableCode) dong = i + 1;
  var cu = dong ? gt[dong - 1] : null;
  if (!dong) dong = gt.length + 1;
  var vung = tab.getRange(dong, 1, 1, td.length);
  COT_BANG_CHU.forEach(function (k) { if (td.indexOf(k) >= 0) vung.getCell(1, td.indexOf(k) + 1).setNumberFormat('@'); });
  vung.setValues([dongBangMoi_(td, cu, giaTri)]);
}

/** Cài đặt của các bảng cho trang quản trị: { tableCode: {...} } */
function caiDatChoTrang_(gtBang) {
  var kq = {};
  var chu = function (o) { return String(o === undefined || o === null ? '' : o).trim(); };
  for (var i = 1; i < (gtBang || []).length; i++) {
    var cd = docCaiDat_(gtBang[0], gtBang[i]);
    if (!cd.tableCode) continue;
    kq[cd.tableCode] = {
      templateFileId: cd.templateFileId, sourceType: chu(cd.sourceType), inputCols: chu(cd.inputCols),
      inputRows: chu(cd.inputRows), lockedRows: chu(cd.lockedRows), allowAddRows: cd.allowAddRows,
      noteTabs: cd.noteTabs.join(', '), dataRows: chu(cd.dataRows)
    };
  }
  return kq;
}

/** Tạo bảng mới: dựng file tổng + ghi tab Bảng. maYeuCau: gọi lại (GAS trả HTML) thì trả kết quả cũ. */
function taoBang_(ss, khai, maYeuCau) {
  var cache = CacheService.getScriptCache(), khoaCache = maYeuCau ? 'qt_tao_bang_' + String(maYeuCau).slice(0, 64) : '';
  if (khoaCache && cache.get(khoaCache)) return JSON.parse(cache.get(khoaCache));
  var kiem = kiemKhaiBangMoi_(khai, docBangQuanLy_(docTabQuanLy_(ss, 'Bảng')).map(function (b) { return b.tableCode; }));
  if (kiem.loi) return { ok: false, loi: kiem.loi };
  var b = kiem.bang;
  var file = dungFileTong_(ss, b);
  var giaTri = {
    tableCode: b.tableCode, tableName: b.tableName, group: b.group, periodType: '', shareType: 'moi',
    sourceType: b.sourceType, rowType: b.sourceType === 'gopTach' ? 'donCoDinh' : 'tuDo',
    templateFileId: file.getId(), inputCols: b.inputCols, inputRows: '', lockedRows: '',
    allowAddRows: b.allowAddRows, noteTabs: '', dataRows: b.dataRows
  };
  ghiCaiDatBang_(ss, b.tableCode, giaTri);
  SpreadsheetApp.flush();
  var kq = {
    ok: true,
    bang: { tableCode: b.tableCode, tableName: b.tableName, group: b.group, managerUnits: [],
      caiDat: caiDatChoTrang_([Object.keys(giaTri), Object.keys(giaTri).map(function (k) { return giaTri[k]; })])[b.tableCode] },
    kiem: kiemMauBang_(ss, b.tableCode).kiem
  };
  if (khoaCache) cache.put(khoaCache, JSON.stringify(kq), 600);
  return kq;
}

/** Lưu cài đặt bảng đã có rồi kiểm lại mẫu. */
function luuBang_(ss, tableCode, caiDat) {
  if (!caiDatBang_(ss, tableCode)) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  var kiem = kiemCaiDatSua_(caiDat);
  if (kiem.loi) return { ok: false, loi: kiem.loi };
  ghiCaiDatBang_(ss, tableCode, kiem.caiDat);
  SpreadsheetApp.flush();
  return { ok: true, caiDat: caiDatChoTrang_(docTabQuanLy_(ss, 'Bảng'))[tableCode], kiem: kiemMauBang_(ss, tableCode).kiem };
}

// ---------- Action quản trị ----------

function xuLyQtTaoBang_(token, khai, maYeuCau) {
  return quanTriChay_(token, function (ss) { return taoBang_(ss, khai, maYeuCau); });
}

function xuLyQtLuuBang_(token, tableCode, caiDat) {
  return quanTriChay_(token, function (ss) { return luuBang_(ss, String(tableCode || '').trim(), caiDat); });
}

function xuLyQtKiemMau_(token, tableCode) {
  return quanTriChay_(token, function (ss) { return kiemMauBang_(ss, String(tableCode || '').trim()); });
}
