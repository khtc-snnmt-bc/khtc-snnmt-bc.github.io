// ============================================================
// bcsnn · gas/QuanLyBang.js
// Vai trò  : Quản lý bảng — dựng file tổng (bảng mẫu) từ khai báo cột trên app,
//            lưu cài đặt bảng (tab "Bảng"), kiểm mẫu theo quy ước thiết kế 5.1,
//            bảng mới từ Excel tải lên, xoá bảng, kiểm bảng đủ file đơn vị + đủ tab kỳ
// Lớp      : gas — gọi bởi: Code.js, PhanQuyen.js, KyBaoCao.js, B04.js (thử) · gọi: KyBaoCao.js, PhanQuyen.js, DangNhap.js
// Phiên bản: 0.10.1 · Cập nhật: 10/10/2026 20:40
// ============================================================
// Mẫu dựng trên app: dòng 1 tên bảng, dòng 2 tiêu đề (A2 = 'Mã đơn vị'), dữ
// liệu từ dòng 3, sẵn `dataRows` dòng. Công thức khai cho dòng 3, app chép xuống.
// Mỗi lĩnh vực một Sheet quản lý nằm trong thư mục Drive của lĩnh vực (b10b) →
// file tổng nằm trong thư mục con tên mã bảng, cạnh Sheet quản lý — file đơn
// vị tạo sau cũng vào đó (taoFileChoDonVi_). Bảng "Sở giao dòng": app dựng
// khung, quản trị điền dòng (mã đơn vị ở cột A) trong file tổng rồi Kiểm mẫu.
// Cột A bảng Sở giao dòng có danh sách chọn: 'all' + mã đơn vị, để trống được.
// Cách tổng hợp (thiết kế 4.4): 'ghep' ghép dòng các đơn vị · 'tong' cộng từng ô · 'cot' ghép cột
// = chia theo xã (mỗi đơn vị một cụm cột byUnitCols, b11) — Cộng và chia theo xã: mọi đơn vị cùng các dòng
// (cột A = 'all'), luôn Sở giao dòng, đơn vị không thêm dòng (chủ dự án chốt 07/10/2026).
// Sửa mẫu sau khi đã tạo kỳ thì tab kỳ đã sinh không đổi.

var MAU_DONG_DAU = 3;
var MAU_DONG_SAN = 20;
var MAU_COT_TOI_DA = 60;
var MAU_DONG_TOI_DA = 500;
var KIEU_COT_NHAP = ['chu', 'so', 'ngay', 'chon'];
var KIEU_COT_HOP_LE = KIEU_COT_NHAP.concat(['congThuc']);
var CACH_NHAP_DONG = ['docLap', 'gopTach'];
var CACH_TONG_HOP = ['ghep', 'tong', 'cot'];
var MAU_EXCEL_TOI_DA = 10 * 1048576;
var MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
var LOI_CONG_THUC = ['#ERROR!', '#NAME?', '#REF!', '#N/A'];
// Cột chữ trong tab Bảng — đặt định dạng chữ kẻo Sheet đổi '5:7' thành giờ
var COT_BANG_CHU = ['inputCols', 'inputRows', 'lockedRows', 'noteTabs', 'hiddenCols', 'byUnitCols'];

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
 * Cách nhập dòng + cách tổng hợp (chung cho bảng mới và sửa) → {gt} hoặc {loi}.
 * Bảng Cộng / Ghép cột luôn là Sở giao dòng (mọi đơn vị cùng các dòng) và không cho thêm dòng.
 */
function kiemPhanLoai_(kb) {
  var tongHop = String(kb.aggregateType || 'ghep');
  if (CACH_TONG_HOP.indexOf(tongHop) < 0) return { loi: 'Cách tổng hợp không hợp lệ' };
  var cungDong = cungDong_(tongHop);
  var cach = cungDong ? 'gopTach' : String(kb.sourceType || '');
  if (CACH_NHAP_DONG.indexOf(cach) < 0) return { loi: 'Cách nhập dòng không hợp lệ' };
  return { gt: { sourceType: cach, aggregateType: tongHop,
    allowAddRows: cungDong ? false : kb.allowAddRows === true } };
}

/** Cộng ('tong') và Ghép cột ('cot'): mọi đơn vị nhận cùng các dòng của mẫu (cột A = all). */
function cungDong_(aggregateType) {
  return aggregateType === 'tong' || aggregateType === 'cot';
}

/** Mã bảng mới → '' nếu dùng được, không thì câu báo lỗi. */
function kiemMaBangMoi_(ma, dsMaCo) {
  if (!/^[a-z0-9_]{2,40}$/.test(ma)) return 'Mã bảng chỉ gồm chữ thường không dấu, số, dấu _ (2–40 ký tự)';
  if ((dsMaCo || []).some(function (m) { return String(m).toLowerCase() === ma; })) return 'Mã bảng "' + ma + '" đã có';
  return '';
}

/**
 * Kiểm khai báo bảng mới tải Excel lên → {tableCode, caiDat} hoặc {loi}.
 * @param {Object} kb — {tableCode, tableName, sourceType, aggregateType, allowAddRows,
 *                      inputCols, inputRows, lockedRows, noteTabs, tenFile, duLieu (base64)}
 */
function kiemKhaiTaiMau_(kb, dsMaCo) {
  kb = kb || {};
  var ma = String(kb.tableCode || '').trim();
  var loiMa = kiemMaBangMoi_(ma, dsMaCo);
  if (loiMa) return { loi: loiMa };
  if (!kb.duLieu) return { loi: 'Chưa chọn file Excel' };
  if (!/\.xlsx$/i.test(String(kb.tenFile || ''))) return { loi: 'Chỉ nhận file Excel .xlsx — file .xls thì mở bằng Excel, Lưu thành .xlsx' };
  if (String(kb.duLieu).length * 3 / 4 > MAU_EXCEL_TOI_DA) return { loi: 'File quá lớn (tối đa ' + (MAU_EXCEL_TOI_DA / 1048576) + ' MB)' };
  var kiem = kiemCaiDatSua_(Object.assign({}, kb, { dataRows: '' }));
  if (kiem.loi) return kiem;
  return { tableCode: ma, caiDat: kiem.caiDat };
}

/**
 * Kiểm khai báo bảng mới gửi từ app → {bang} đã chuẩn hoá hoặc {loi}.
 * @param {Object} kb — {tableCode, tableName, sourceType, aggregateType, allowAddRows, dataRows, cot: [{ten, kieu, congThuc, luaChon}]}
 * @param {Array<string>} dsMaCo — mã bảng đã có
 */
function kiemKhaiBangMoi_(kb, dsMaCo) {
  kb = kb || {};
  var ma = String(kb.tableCode || '').trim();
  var loiMa = kiemMaBangMoi_(ma, dsMaCo);
  if (loiMa) return { loi: loiMa };
  var ten = String(kb.tableName || '').trim();
  if (!ten) return { loi: 'Chưa ghi tên bảng' };
  var phanLoai = kiemPhanLoai_(kb);
  if (phanLoai.loi) return phanLoai;
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
    tableCode: ma, tableName: ten, sourceType: phanLoai.gt.sourceType,
    aggregateType: phanLoai.gt.aggregateType, allowAddRows: phanLoai.gt.allowAddRows, dataRows: soDong, inputCols: inputCols, cot: cot
  } };
}

/** Kiểm phần cài đặt sửa trên app → {caiDat} chuẩn hoá (chỉ khoá sửa được) hoặc {loi}. */
function kiemCaiDatSua_(cd) {
  cd = cd || {};
  var kq = {};
  kq.tableName = String(cd.tableName || '').trim();
  if (!kq.tableName) return { loi: 'Chưa ghi tên bảng' };
  var phanLoai = kiemPhanLoai_(cd);
  if (phanLoai.loi) return phanLoai;
  kq.sourceType = phanLoai.gt.sourceType;
  kq.aggregateType = phanLoai.gt.aggregateType;
  kq.inputCols = String(cd.inputCols || '').trim().toUpperCase();
  if (!hopLeDsCot_(kq.inputCols)) return { loi: 'Cột được nhập ghi chữ cột, ví dụ C:J, L' };
  kq.inputRows = String(cd.inputRows || '').trim();
  if (kq.inputRows && !hopLeDsDong_(kq.inputRows)) return { loi: 'Dòng được nhập ghi số dòng, ví dụ 5:20, 25' };
  kq.lockedRows = String(cd.lockedRows || '').trim();
  if (kq.lockedRows && !hopLeDsDong_(kq.lockedRows)) return { loi: 'Dòng khoá ghi số dòng, ví dụ 5, 9:10' };
  kq.allowAddRows = phanLoai.gt.allowAddRows;
  kq.noteTabs = tachDsMa_(cd.noteTabs).join(', ');
  var soDong = soDongSan_(cd.dataRows, '');
  if (soDong === -1) return { loi: 'Số dòng sẵn phải là số nguyên từ 1 đến ' + MAU_DONG_TOI_DA };
  kq.dataRows = soDong;
  kq.lockDay = ngayKhoaThang_(cd.lockDay);
  if (kq.lockDay === -1) return { loi: 'Tự khoá: ghi ngày trong tháng, từ 1 đến 31 (để trống = không tự khoá)' };
  kq.hiddenCols = String(cd.hiddenCols || '').trim().toUpperCase();
  if (kq.hiddenCols && !hopLeDsCot_(kq.hiddenCols)) return { loi: 'Cột ẩn ở file đơn vị ghi chữ cột, ví dụ B, D:E' };
  kq.periodMode = cd.periodMode === KY_CAP_NHAT ? KY_CAP_NHAT : KY_NHAP_MOI;
  kq.shareType = chuanChiaSe_(cd.shareType);
  kq.aggregateKeep = chuanGiuTongHop_(cd.aggregateKeep);
  kq.byUnitCols = String(cd.byUnitCols || '').trim().toUpperCase();
  if (kq.byUnitCols && !hopLeDsCot_(kq.byUnitCols)) return { loi: 'Cột chia theo xã ghi chữ cột, ví dụ E:J' };
  kq.cityTotal = cd.cityTotal === true;
  return { caiDat: kq };
}

/**
 * Bảng đã đủ file đơn vị, đủ tab kỳ chưa (nút Kiểm tra bảng).
 * @param {Array<{unitCode, fileId, access}>} giao — dòng tab File của bảng
 * @param {{ma: Array<string>, coAll: boolean}|null} cotA — mã ở cột A file tổng (bảng Sở giao dòng); null = tự nhập dòng
 * @param {Array<string>} dsKy — tên các kỳ của bảng trong sổ kỳ
 * @param {Object} tabFile — unitCode → tên các tab của file; null = không mở được; không có khoá = chưa kiểm (hết giờ)
 * @param {Array<string>} tabTong — tên các tab của file tổng (mỗi kỳ một tab)
 */
function kiemDuFile_(giao, cotA, dsKy, tabFile, tabTong) {
  var kq = { soKy: dsKy.length, soDonVi: 0, coFile: 0, thieuFile: [], fileHong: [], chuaGiao: [], thieuTab: [], chuaKiem: 0,
    tongThieu: dsKy.filter(function (k) { return (tabTong || []).indexOf(k) < 0; }) };
  var daGiao = {};
  giao.forEach(function (g) {
    daGiao[g.unitCode] = true;
    if (g.access === 'khong') return;   // đã bỏ quyền: đơn vị không thấy bảng, không cần file
    kq.soDonVi++;
    if (!g.fileId) {
      kq.thieuFile.push({ unitCode: g.unitCode,
        ly: cotA && !cotA.coAll && cotA.ma.indexOf(g.unitCode) < 0 ? 'không có dòng nào mang mã này ở cột A file tổng' : '' });
      return;
    }
    kq.coFile++;
    if (!(g.unitCode in tabFile)) { kq.chuaKiem++; return; }
    var ten = tabFile[g.unitCode];
    if (!ten) { kq.fileHong.push(g.unitCode); return; }
    var thieu = dsKy.filter(function (k) { return ten.indexOf(k) < 0; });
    if (thieu.length) kq.thieuTab.push({ unitCode: g.unitCode, ky: thieu });
  });
  if (cotA) kq.chuaGiao = cotA.ma.filter(function (m) { return !daGiao[m]; });
  return kq;
}

function loiMau_(cho, loi, cach) {
  return { cho: cho, loi: loi, cach: cach };
}

/** Lỗi kiemMau_ cho Excel tải lên: file tổng chưa được giữ → cách sửa chỉ về file Excel. */
function loiChoExcel_(dsLoi) {
  return dsLoi.map(function (l) {
    var cach = /^Mã ".*" không có trong danh mục/.test(l.loi)
      ? 'Sửa mã trong file Excel, hoặc thêm đơn vị ở mục Tài khoản'
      : l.cach.replace('trong file tổng', 'trong file Excel');
    return loiMau_(l.cho, l.loi, cach);
  });
}

/** [5,6,7,9] → '5–7, 9' (để báo) */
function vietDsDong_(ds) {
  return gomDoan_(ds).map(function (d) { return d[0] === d[1] ? String(d[0]) : d[0] + '–' + d[1]; }).join(', ');
}

/**
 * Kiểm file tổng theo quy ước 5.1 + cài đặt bảng.
 * @param {{cotA: Array, soCot: number, tenTab: Array<string>, oLoi: Array<{cot, dong, giaTri}>}} m — đọc từ file tổng
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

  var laTong = cungDong_(caiDat.aggregateType);
  if (laTong && !laTach) {
    loi.push(loiMau_('Cài đặt', 'Bảng tổng các đơn vị mà đơn vị tự nhập dòng', 'Chọn Cách nhập dòng "Sở giao dòng sẵn"'));
  }
  var coMa = [], maSai = {}, khongAll = [];
  for (var d = dongTieuDe + 1; d <= m.cotA.length; d++) {
    var ma = String(m.cotA[d - 1] === undefined || m.cotA[d - 1] === null ? '' : m.cotA[d - 1]).trim();
    if (!ma) continue;
    coMa.push(d);
    if (laTong && ma !== MA_MOI_DON_VI) khongAll.push(d);
    else if (ma !== MA_MOI_DON_VI && (dsMaDonVi || []).indexOf(ma) < 0) (maSai[ma] = maSai[ma] || []).push(d);
  }
  if (laTach) {
    if (!coMa.length) {
      loi.push(laTong
        ? loiMau_('Cột A', 'Chưa có dòng nào ghi ' + MA_MOI_DON_VI, 'Bảng tổng các đơn vị: ghi ' + MA_MOI_DON_VI + ' vào cột A các dòng mọi đơn vị cùng nhập')
        : loiMau_('Cột A', 'Chưa có dòng nào ghi mã đơn vị', 'Bảng Sở giao dòng: chọn mã đơn vị ở cột A từng dòng (' + MA_MOI_DON_VI + ' = mọi đơn vị)'));
    }
    if (khongAll.length) {
      loi.push(loiMau_('Cột A dòng ' + vietDsDong_(khongAll), 'Bảng tổng các đơn vị mà dòng ghi mã riêng',
        'Đổi thành ' + MA_MOI_DON_VI + ' — bảng tổng thì mọi đơn vị nhận cùng các dòng'));
    }
    Object.keys(maSai).forEach(function (ma) {
      loi.push(loiMau_('Cột A dòng ' + vietDsDong_(maSai[ma]), 'Mã "' + ma + '" không có trong danh mục đơn vị',
        'Chọn mã trong danh sách của ô (sửa danh mục ở tab Đơn vị của Sheet quản lý)'));
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

  // Ô lỗi gộp theo cột + loại lỗi: 'Cột G dòng 5–14'
  var nhomLoi = {}, thuTu = [];
  (m.oLoi || []).forEach(function (o) {
    var k = o.cot + '|' + o.giaTri;
    if (!nhomLoi[k]) { nhomLoi[k] = { cot: o.cot, giaTri: o.giaTri, dong: [] }; thuTu.push(k); }
    nhomLoi[k].dong.push(o.dong);
  });
  thuTu.forEach(function (k) {
    var n = nhomLoi[k];
    loi.push(loiMau_('Cột ' + chuCot_(n.cot) + ' dòng ' + vietDsDong_(n.dong), 'Công thức báo ' + n.giaTri,
      'Sửa công thức trong file tổng (vùng tiếng Việt ngăn đối số bằng dấu ;)'));
  });
  return loi;
}

/**
 * Mã đơn vị ở cột A dưới dòng tiêu đề của file tổng → { ma: [mã có trong danh mục, không lặp],
 * coAll: có dòng 'all', sai: [mã lạ] }. 'all' không tự giao (sẽ là mọi đơn vị, kể cả phòng của Sở).
 */
function maTrongMau_(cotA, dsMaDonVi) {
  var kq = { ma: [], coAll: false, sai: [] };
  var dongTieuDe = timDongTieuDe_(cotA);
  if (!dongTieuDe) return kq;
  cotA.slice(dongTieuDe).forEach(function (o) {
    var ma = String(o === undefined || o === null ? '' : o).trim();
    if (!ma) return;
    if (ma === MA_MOI_DON_VI) kq.coAll = true;
    else if ((dsMaDonVi || []).indexOf(ma) < 0) { if (kq.sai.indexOf(ma) < 0) kq.sai.push(ma); }
    else if (kq.ma.indexOf(ma) < 0) kq.ma.push(ma);
  });
  return kq;
}

/**
 * Đơn vị hiện ở mục Phân quyền của một bảng (mã): Sở giao dòng → mã ở cột A file tổng;
 * có dòng 'all' hoặc bảng đơn vị tự nhập dòng → mọi đơn vị. Bỏ đơn vị nhóm Quản trị
 * (đã thấy mọi bảng — PhanQuyen.js donViToanQuyen_).
 */
function donViPhanQuyen_(laTach, doc, tatCa, toanQuyen) {
  var ds = laTach && !doc.coAll ? doc.ma : tatCa;
  return ds.filter(function (m) { return toanQuyen.indexOf(m) < 0; });
}

/** Dòng cuối (số dòng từ 1) có chữ ở cột A dưới dòng tiêu đề; chưa có dòng nào → dòng tiêu đề. */
function dongCuoiCoMa_(cotA, dongTieuDe) {
  var cuoi = dongTieuDe;
  for (var d = dongTieuDe + 1; d <= cotA.length; d++) if (String(cotA[d - 1] === undefined || cotA[d - 1] === null ? '' : cotA[d - 1]).trim()) cuoi = d;
  return cuoi;
}

/** Giá trị cài đặt → mảng một dòng theo thứ tự tiêu đề tab Bảng (giữ ô cũ ở cột không có trong giaTri). */
function dongBangMoi_(tieuDe, cu, giaTri) {
  return tieuDe.map(function (ten, i) {
    ten = String(ten).trim();
    return ten in giaTri ? giaTri[ten] : (cu ? cu[i] : '');
  });
}

// ---------- Chạm Drive / Sheet ----------

/**
 * Thư mục của bảng: {thư mục Sheet quản lý của lĩnh vực}/{mã bảng} (đã có thì dùng lại).
 * Thư mục bảng đang nằm chỗ khác (thư mục cha của file tổng mang tên mã bảng) → dời cả thư mục sang.
 * @param {Object} bang — {tableCode, templateFileId?}
 */
function thuMucBang_(ss, bang) {
  var cha = DriveApp.getFileById(ss.getId()).getParents();
  var goc = cha.hasNext() ? cha.next() : DriveApp.getRootFolder();
  var ma = bang.tableCode;
  var co = goc.getFoldersByName(ma);
  if (co.hasNext()) return co.next();
  var tmCu = null;
  if (bang.templateFileId) {
    try {
      var p = DriveApp.getFileById(bang.templateFileId).getParents();
      if (p.hasNext()) { var tm = p.next(); if (tm.getName() === ma) tmCu = tm; }
    } catch (err) { /* file tổng đã mất: tạo thư mục mới */ }
  }
  return tmCu ? tmCu.moveTo(goc) : goc.createFolder(ma);
}

/**
 * Dời file tổng + mọi file đơn vị của bảng về thư mục con tên mã bảng (file đã ở đó thì bỏ qua).
 * Dừng sớm khi gần hết 6 phút của GAS; còn sót thì lần Lưu / Kiểm tra bảng sau dời tiếp.
 * Trả { tong, daDoi, loi: [câu báo] } — lỗi từng file được báo, không nuốt.
 */
function doiFileVaoThuMucBang_(ss, tableCode) {
  var batDau = Date.now(), kq = { tong: 0, daDoi: 0, loi: [] };
  var cd = caiDatBang_(ss, tableCode);
  if (!cd) return kq;
  var ids = [];
  if (cd.templateFileId) ids.push(cd.templateFileId);
  giaoCuaBangKy_(docTabQuanLy_(ss, 'File'), tableCode).forEach(function (g) { if (g.fileId) ids.push(g.fileId); });
  kq.tong = ids.length;
  if (!ids.length) return kq;
  var thuMuc = thuMucBang_(ss, cd), idThuMuc = thuMuc.getId();
  for (var i = 0; i < ids.length; i++) {
    if (Date.now() - batDau > 270000) { kq.loi.push('Hết thời gian, còn ' + (ids.length - i) + ' file chưa xét — bấm lại để dời tiếp'); break; }
    try {
      var f = DriveApp.getFileById(ids[i]), p = f.getParents(), dung = false;
      while (p.hasNext()) if (p.next().getId() === idThuMuc) dung = true;
      if (!dung) { f.moveTo(thuMuc); kq.daDoi++; }
    } catch (err) { kq.loi.push('File ' + ids[i].slice(0, 8) + '…: ' + String(err.message || err)); }
  }
  return kq;
}

/** Danh sách chọn ở cột A: 'all' + mã đơn vị; ô trống vẫn được (quản trị tự chọn sau). */
function datChonMaDonVi_(vung, dsMaDonVi) {
  vung.setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList([MA_MOI_DON_VI].concat(dsMaDonVi), true).setAllowInvalid(false).build());
}

/** Bảng Sở giao dòng: đặt lại danh sách chọn mã cho cột A của file tổng (danh mục đơn vị có thể đã đổi). */
function capNhatChonMaMau_(templateFileId, dsMaDonVi) {
  var tab = SpreadsheetApp.openById(templateFileId).getSheets()[0];
  var soDong = Math.max(tab.getLastRow(), 1);
  var dongTieuDe = timDongTieuDe_(tab.getRange(1, 1, soDong, 1).getValues().map(function (d) { return d[0]; }));
  var cuoi = Math.max(soDong, tab.getMaxRows());
  if (dongTieuDe && cuoi > dongTieuDe) datChonMaDonVi_(tab.getRange(dongTieuDe + 1, 1, cuoi - dongTieuDe, 1), dsMaDonVi);
}

/** Dựng file tổng `{mãBảng}_TONG` theo khai báo đã kiểm. */
function dungFileTong_(ss, bang, dsMaDonVi) {
  var file = SpreadsheetApp.create(bang.tableCode + '_TONG');
  DriveApp.getFileById(file.getId()).moveTo(thuMucBang_(ss, bang));
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
  if (bang.sourceType === 'gopTach') {
    var cotA = tab.getRange(MAU_DONG_DAU, 1, bang.dataRows, 1);
    datChonMaDonVi_(cotA, dsMaDonVi);
    if (cungDong_(bang.aggregateType)) {
      cotA.setValues(cotA.getValues().map(function () { return [MA_MOI_DON_VI]; }));
    }
  }
  SpreadsheetApp.flush();
  return file;
}

/** Đọc file tổng để kiểm: cột A, số cột, tên tab, ô công thức lỗi (tối đa 500 ô). */
function docMau_(file) {
  var tab = file.getSheets()[0];
  var soDong = Math.max(tab.getLastRow(), 1), soCot = Math.max(tab.getLastColumn(), 1);
  var hien = tab.getRange(1, 1, soDong, soCot).getDisplayValues();
  var oLoi = [];
  for (var r = 0; r < hien.length && oLoi.length < 500; r++) {
    for (var c = 0; c < hien[r].length && oLoi.length < 500; c++) {
      if (LOI_CONG_THUC.indexOf(hien[r][c]) >= 0) oLoi.push({ cot: c + 1, dong: r + 1, giaTri: hien[r][c] });
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
  var doi = doiFileVaoThuMucBang_(ss, tableCode);
  if (!caiDat.templateFileId) return { ok: true, doi: doi, kiem: [loiMau_('File tổng', 'Bảng chưa có file tổng', 'Tạo bảng mới trên app hoặc tải mẫu lên')] };
  return { ok: true, doi: doi, kiem: kiemMau_(docMau_(SpreadsheetApp.openById(caiDat.templateFileId)), caiDat, maDonViCo_(ss)) };
}

/**
 * Mở từng file đơn vị của bảng, đọc tên tab → kiemDuFile_. ~0,5 s/file; quá KY_MS_TOI_DA thì
 * dừng, phần còn lại báo "chưa kiểm". File trong thùng rác vẫn mở được → coi như hỏng.
 */
function kiemDuFileBang_(ss, tableCode) {
  var hetGio = Date.now() + KY_MS_TOI_DA;
  var cd = caiDatBang_(ss, tableCode);
  var giao = docFileQuanLy_(docTabQuanLy_(ss, 'File')).filter(function (f) { return f.tableCode === tableCode; });
  var cotA = cd.sourceType === 'gopTach' && cd.templateFileId ? maTrongMau_(docCotAMau_(cd.templateFileId), maDonViCo_(ss)) : null;
  var dsKy = docKyQuanLy_(docTabQuanLy_(ss, TAB_KY))
    .filter(function (k) { return k.tableCode === tableCode; }).map(function (k) { return k.periodName; });
  var tabFile = {};
  giao.forEach(function (g) {
    if (!g.fileId || g.access === 'khong' || Date.now() > hetGio) return;
    try {
      tabFile[g.unitCode] = DriveApp.getFileById(g.fileId).isTrashed() ? null
        : SpreadsheetApp.openById(g.fileId).getSheets().map(function (t) { return t.getName(); });
    } catch (err) {
      tabFile[g.unitCode] = null;
    }
  });
  var tabTong = cd.templateFileId ? SpreadsheetApp.openById(cd.templateFileId).getSheets().map(function (t) { return t.getName(); }) : [];
  return kiemDuFile_(giao, cotA, dsKy, tabFile, tabTong);
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
      noteTabs: cd.noteTabs.join(', '), dataRows: chu(cd.dataRows), aggregateType: cd.aggregateType,
      lockDay: chu(cd.lockDay), hiddenCols: cd.hiddenCols, periodMode: cd.periodMode, shareType: cd.shareType,
      aggregateKeep: cd.aggregateKeep, byUnitCols: chu(cd.byUnitCols), cityTotal: cd.cityTotal
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
  var file = dungFileTong_(ss, b, maDonViCo_(ss));
  var giaTri = {
    tableCode: b.tableCode, tableName: b.tableName, periodType: '', shareType: 'moi',
    sourceType: b.sourceType, aggregateType: b.aggregateType, rowType: b.sourceType === 'gopTach' ? 'donCoDinh' : 'tuDo',
    templateFileId: file.getId(), inputCols: b.inputCols, inputRows: '', lockedRows: '',
    allowAddRows: b.allowAddRows, noteTabs: '', dataRows: b.dataRows
  };
  ghiCaiDatBang_(ss, b.tableCode, giaTri);
  SpreadsheetApp.flush();
  var kq = {
    ok: true,
    bang: { tableCode: b.tableCode, tableName: b.tableName,
      caiDat: caiDatChoTrang_([Object.keys(giaTri), Object.keys(giaTri).map(function (k) { return giaTri[k]; })])[b.tableCode] },
    kiem: kiemMauBang_(ss, b.tableCode).kiem
  };
  if (khoaCache) cache.put(khoaCache, JSON.stringify(kq), 600);
  return kq;
}

/**
 * Bảng mới từ Excel tải lên: chuyển xlsx thành Google Sheet `{mãBảng}_TONG` (giữ công thức,
 * ô gộp, danh sách chọn, mọi tab) rồi chạy kiemMau_. Mẫu sai → bỏ file vừa chuyển, không ghi
 * bảng, trả {kiem} để quản trị sửa Excel rồi tải lại. Mẫu đúng → ghi tab Bảng như taoBang_;
 * bảng Sở giao dòng thì giao luôn cho các mã ở cột A (giaoTuDong = kết quả giaoTheoMau_).
 * Tạo kỳ chỉ chép tab đầu + tab chú thích; các tab khác (VD Tổng hợp) ở lại file tổng.
 */
function taiMauExcel_(ss, khai, maYeuCau) {
  var cache = CacheService.getScriptCache(), khoaCache = maYeuCau ? 'qt_tai_mau_' + String(maYeuCau).slice(0, 64) : '';
  if (khoaCache && cache.get(khoaCache)) return JSON.parse(cache.get(khoaCache));
  var kiem = kiemKhaiTaiMau_(khai, docBangQuanLy_(docTabQuanLy_(ss, 'Bảng')).map(function (b) { return b.tableCode; }));
  if (kiem.loi) return { ok: false, loi: kiem.loi };
  var ma = kiem.tableCode, cd = kiem.caiDat, dsMaDonVi = maDonViCo_(ss);

  var thuMuc = thuMucBang_(ss, { tableCode: ma }), id;
  try {
    var blob = Utilities.newBlob(Utilities.base64Decode(String(khai.duLieu)), MIME_XLSX, String(khai.tenFile));
    id = Drive.Files.create({ name: ma + '_TONG', mimeType: MimeType.GOOGLE_SHEETS, parents: [thuMuc.getId()] }, blob).id;
  } catch (err) {
    boThuMucRong_(thuMuc);
    return { ok: false, loi: 'Google không mở được file này như bảng Excel — mở bằng Excel, Lưu thành .xlsx rồi tải lại' };
  }
  var file = SpreadsheetApp.openById(id);
  var loi = kiemMau_(docMau_(file), Object.assign({}, cd, { noteTabs: tachDsMa_(cd.noteTabs) }), dsMaDonVi);
  var kq;
  if (loi.length) {
    DriveApp.getFileById(id).setTrashed(true);
    boThuMucRong_(thuMuc);
    kq = { ok: true, kiem: loiChoExcel_(loi) };
  } else {
    var giaTri = Object.assign({
      tableCode: ma, periodType: '', shareType: 'moi', templateFileId: id,
      rowType: cd.sourceType === 'gopTach' ? 'donCoDinh' : 'tuDo'
    }, cd);
    ghiCaiDatBang_(ss, ma, giaTri);
    if (cd.sourceType === 'gopTach') capNhatChonMaMau_(id, dsMaDonVi);
    SpreadsheetApp.flush();
    kq = {
      ok: true,
      bang: { tableCode: ma, tableName: cd.tableName,
        caiDat: caiDatChoTrang_(docTabQuanLy_(ss, 'Bảng'))[ma] },
      kiem: []
    };
    // Sở giao dòng: tự giao bảng cho các đơn vị có mã ở cột A (như bấm "Giao theo mã trong bảng")
    if (cd.sourceType === 'gopTach') {
      try { kq.giaoTuDong = giaoTheoMau_(ss, ma); } catch (err) { kq.giaoTuDong = { ok: false, loi: String(err.message || err) }; }
    }
  }
  if (khoaCache) cache.put(khoaCache, JSON.stringify(kq), 600);
  return kq;
}

/**
 * Xoá bảng: gỡ quyền + bỏ vào thùng rác file đơn vị, file tổng, thư mục bảng (Drive giữ
 * thùng rác ~30 ngày — chủ file khôi phục được); xoá dòng của bảng ở tab Bảng, File, Kỳ.
 */
function xoaBang_(ss, tableCode) {
  var cd = caiDatBang_(ss, tableCode);
  if (!cd) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  var soFile = 0;
  giaoCuaBangKy_(docTabQuanLy_(ss, 'File'), tableCode).forEach(function (g) {
    if (!g.fileId) return;
    boFile_(g.fileId);
    soFile++;
  });
  if (cd.templateFileId) {
    var thuMuc = DriveApp.getFileById(cd.templateFileId).getParents();
    boFile_(cd.templateFileId);
    if (thuMuc.hasNext()) {
      var tm = thuMuc.next();
      if (tm.getName() === tableCode) tm.setTrashed(true);
    }
  }
  // Cột mã bảng: tab Bảng tìm theo tiêu đề · File cột B · Kỳ cột A (docFileQuanLy_, docKyQuanLy_)
  [['Bảng', -1], ['File', 1], [TAB_KY, 0]].forEach(function (tc) {
    var tab = ss.getSheetByName(tc[0]);
    if (!tab) return;
    var gt = tab.getDataRange().getValues();
    var cot = tc[1] >= 0 ? tc[1] : gt[0].map(function (o) { return String(o).trim(); }).indexOf('tableCode');
    if (cot < 0) return;
    for (var i = gt.length - 1; i >= 1; i--) if (String(gt[i][cot]).trim() === tableCode) tab.deleteRow(i + 1);
  });
  SpreadsheetApp.flush();
  return { ok: true, soFileDonVi: soFile };
}

/** Gỡ người được chia sẻ rồi bỏ file vào thùng rác (file đã mất thì bỏ qua). */
function boFile_(fileId) {
  try {
    var f = DriveApp.getFileById(fileId);
    f.getEditors().forEach(function (u) { f.removeEditor(u); });
    f.getViewers().forEach(function (u) { f.removeViewer(u); });
    f.setTrashed(true);
  } catch (err) { /* file đã bị xoá tay */ }
}

/** Thư mục bảng không còn gì (vừa tạo cho lần tải lỗi) → bỏ vào thùng rác. */
function boThuMucRong_(thuMuc) {
  // getFiles() còn đếm file trong thùng rác → lọc trashed = false
  if (!thuMuc.searchFiles('trashed = false').hasNext() && !thuMuc.searchFolders('trashed = false').hasNext()) thuMuc.setTrashed(true);
}

/** Lưu cài đặt bảng đã có rồi kiểm lại mẫu. Đổi cách nhập (công khai ↔ Gmail) → soát quyền mọi file của bảng. */
function luuBang_(ss, tableCode, caiDat) {
  var cu = caiDatBang_(ss, tableCode);
  if (!cu) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  var kiem = kiemCaiDatSua_(caiDat);
  if (kiem.loi) return { ok: false, loi: kiem.loi };
  ghiCaiDatBang_(ss, tableCode, kiem.caiDat);
  SpreadsheetApp.flush();
  var cd = caiDatBang_(ss, tableCode);
  if (cd.templateFileId && cd.sourceType === 'gopTach') capNhatChonMaMau_(cd.templateFileId, maDonViCo_(ss));
  var kt = kiemMauBang_(ss, tableCode);
  var kq = { ok: true, caiDat: caiDatChoTrang_(docTabQuanLy_(ss, 'Bảng'))[tableCode], kiem: kt.kiem, doi: kt.doi };
  if (cu.shareType !== cd.shareType) kq.quyen = dongBoQuyen_(ss, { tableCodes: [tableCode] });
  return kq;
}

/**
 * Giao bảng cho mọi đơn vị có mã ở cột A file tổng (thêm vào giao đang có, không bỏ ai),
 * rồi chia quyền file — như bấm Lưu ở mục Phân quyền.
 */
function giaoTheoMau_(ss, tableCode) {
  var caiDat = caiDatBang_(ss, tableCode);
  if (!caiDat) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  if (!caiDat.templateFileId) return { ok: false, loi: 'Bảng chưa có file tổng' };
  var tab = SpreadsheetApp.openById(caiDat.templateFileId).getSheets()[0];
  var cotA = tab.getRange(1, 1, Math.max(tab.getLastRow(), 1), 1).getValues().map(function (d) { return d[0]; });
  var doc = maTrongMau_(cotA, maDonViCo_(ss));
  var tabFile = ss.getSheetByName('File');
  var dsFile = tabFile.getDataRange().getValues();
  // Giữ quyền đang đặt (kể cả đơn vị đã bị bỏ quyền); mã mới → được nhập
  var quyen = {};
  docFileQuanLy_(dsFile).forEach(function (f) { if (f.tableCode === tableCode) quyen[f.unitCode] = f.access; });
  var dangGiao = Object.keys(quyen).filter(function (uc) { return quyen[uc] !== 'khong'; });
  var moi = doc.ma.filter(function (m) { return !(m in quyen); });
  var kq = { ok: true, moi: moi, tong: dangGiao.length + moi.length, coAll: doc.coAll, sai: doc.sai, docDuoc: doc.ma.length };
  if (moi.length) {
    moi.forEach(function (m) { quyen[m] = 'sua'; });
    ghiTabFile_(tabFile, capNhatGiao_(dsFile, tableCode, quyen).dong);
    SpreadsheetApp.flush();
    kq.quyen = dongBoQuyen_(ss, { tableCodes: [tableCode] });
  }
  kq.giao = docFileQuanLy_(docTabQuanLy_(ss, 'File')).map(function (f) {
    return { unitCode: f.unitCode, tableCode: f.tableCode, coFile: !!f.fileId, access: f.access };
  });
  return kq;
}

/** Cột A tab đầu của file tổng (mảng ô). */
function docCotAMau_(templateFileId) {
  var tab = SpreadsheetApp.openById(templateFileId).getSheets()[0];
  return tab.getRange(1, 1, Math.max(tab.getLastRow(), 1), 1).getValues().map(function (d) { return d[0]; });
}

/** Danh sách đơn vị cho mục Phân quyền của bảng, đọc từ file tổng → { ma, laTach, coAll, sai }. */
function donViCuaBang_(ss, tableCode) {
  var cd = caiDatBang_(ss, tableCode);
  if (!cd) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  var tatCa = maDonViCo_(ss), toanQuyen = donViToanQuyen_(docTabQuanLy_(ss, 'Đơn vị'));
  var laTach = cd.sourceType === 'gopTach';
  var doc = { ma: [], coAll: false, sai: [] };
  if (laTach) {
    if (!cd.templateFileId) return { ok: false, loi: 'Bảng chưa có file tổng' };
    doc = maTrongMau_(docCotAMau_(cd.templateFileId), tatCa);
  }
  return { ok: true, tableCode: tableCode, laTach: laTach, coAll: doc.coAll, sai: doc.sai,
    ma: donViPhanQuyen_(laTach, doc, tatCa, toanQuyen) };
}

/**
 * Thêm một dòng cho đơn vị vào cuối phần dữ liệu file tổng (bảng Sở giao dòng): chép dòng
 * có mã cuối cùng (định dạng, công thức, danh sách chọn), xoá ô chữ/số, ghi mã ở cột A;
 * rồi giao bảng cho đơn vị (được nhập) + chia quyền. Nội dung dòng quản trị tự ghi ở file tổng.
 */
function themDongDonVi_(ss, tableCode, unitCode) {
  var cd = caiDatBang_(ss, tableCode);
  if (!cd) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  if (cd.sourceType !== 'gopTach' || !cd.templateFileId) return { ok: false, loi: 'Chỉ bảng Sở giao dòng có file tổng mới thêm dòng đơn vị được' };
  var uc = String(unitCode || '').trim();
  if (maDonViCo_(ss).indexOf(uc) < 0) return { ok: false, loi: 'Không có đơn vị ' + uc + ' trong danh mục' };
  var tab = SpreadsheetApp.openById(cd.templateFileId).getSheets()[0];
  var cotA = tab.getRange(1, 1, Math.max(tab.getLastRow(), 1), 1).getValues().map(function (d) { return d[0]; });
  var dongTieuDe = timDongTieuDe_(cotA);
  if (!dongTieuDe) return { ok: false, loi: 'File tổng không có dòng nào ô A ghi "' + NHAN_COT_A + '"' };
  var cuoi = dongCuoiCoMa_(cotA, dongTieuDe), moi = cuoi + 1, soCot = tab.getLastColumn();
  tab.insertRowAfter(cuoi);
  var vung = tab.getRange(moi, 1, 1, soCot);
  if (cuoi > dongTieuDe) {
    tab.getRange(cuoi, 1, 1, soCot).copyTo(vung);
    vung.setFormulas(vung.getFormulas());   // giữ công thức, ô không công thức thành trống
  }
  tab.getRange(moi, 1).setValue(uc);

  var tabFile = ss.getSheetByName('File');
  var dsFile = tabFile.getDataRange().getValues(), quyen = {};
  docFileQuanLy_(dsFile).forEach(function (f) { if (f.tableCode === tableCode) quyen[f.unitCode] = f.access; });
  if (quyen[uc] !== 'xem') quyen[uc] = 'sua';
  ghiTabFile_(tabFile, capNhatGiao_(dsFile, tableCode, quyen).dong);
  SpreadsheetApp.flush();
  var kq = donViCuaBang_(ss, tableCode);
  kq.dong = moi;
  kq.quyen = dongBoQuyen_(ss, { tableCodes: [tableCode] });
  kq.giao = docFileQuanLy_(docTabQuanLy_(ss, 'File')).map(function (f) {
    return { unitCode: f.unitCode, tableCode: f.tableCode, coFile: !!f.fileId, access: f.access };
  });
  return kq;
}

function xuLyQtDonViBang_(token, tableCode) {
  return quanTriChay_(token, function (ss) { return donViCuaBang_(ss, String(tableCode || '').trim()); });
}

function xuLyQtThemDongDonVi_(token, tableCode, unitCode) {
  return quanTriChay_(token, function (ss) { return themDongDonVi_(ss, String(tableCode || '').trim(), unitCode); });
}

// ---------- Action quản trị ----------

function xuLyQtGiaoTheoMau_(token, tableCode) {
  return quanTriChay_(token, function (ss) { return giaoTheoMau_(ss, String(tableCode || '').trim()); });
}

function xuLyQtTaoBang_(token, khai, maYeuCau) {
  return quanTriChay_(token, function (ss) { return taoBang_(ss, khai, maYeuCau); });
}

function xuLyQtTaiMau_(token, khai, maYeuCau) {
  return quanTriChay_(token, function (ss) { return taiMauExcel_(ss, khai, maYeuCau); });
}

/**
 * File Excel mẫu để quản trị tải về tự kẻ bảng / nhập công thức / trình bày rồi tải lên:
 * tab "Mẫu" có sẵn ô A2 "Mã đơn vị" + danh sách chọn mã ở cột A; tab "Mã đơn vị" liệt kê
 * `all` + mã, tên các đơn vị hiện có. Dựng Sheet tạm → xuất .xlsx → bỏ vào thùng rác.
 */
function mauExcelTrong_(ss) {
  var dv = xuLyLayDonVi_(ss.getId());
  if (!dv.ok) return { ok: false, loi: dv.loi };
  var tam = SpreadsheetApp.create('mau_excel_tam'), id = tam.getId();
  try {
    var tabMa = tam.getSheets()[0].setName('Mã đơn vị');
    var dong = [['Mã', 'Tên đơn vị'], [MA_MOI_DON_VI, 'Mọi đơn vị']].concat(dv.donVi.map(function (d) { return [d.unitCode, d.unitName]; }));
    tabMa.getRange(1, 1, dong.length, 2).setValues(dong);
    tabMa.getRange(1, 1, 1, 2).setFontWeight('bold');
    tabMa.setColumnWidth(2, 320);
    var mau = tam.insertSheet('Mẫu', 0);
    mau.getRange(1, 1).setValue('Tên bảng (sửa lại)').setFontWeight('bold').setFontSize(13);
    mau.getRange(MAU_DONG_DAU - 1, 1, 1, 2).setValues([[NHAN_COT_A, 'Tên cột (sửa lại)']]).setFontWeight('bold');
    mau.getRange(MAU_DONG_DAU, 1, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInRange(tabMa.getRange(2, 1, dong.length - 1, 1), true).setAllowInvalid(false).build());
    SpreadsheetApp.flush();
    var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' +
      encodeURIComponent(MIME_XLSX), { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return { ok: false, loi: 'Google không xuất được file Excel mẫu (mã ' + res.getResponseCode() + ')' };
    return { ok: true, tenFile: 'mau_bang.xlsx', duLieu: Utilities.base64Encode(res.getContent()) };
  } finally {
    DriveApp.getFileById(id).setTrashed(true);
  }
}

function xuLyQtMauExcel_(token) {
  return quanTriChay_(token, function (ss) { return mauExcelTrong_(ss); });
}

function xuLyQtXoaBang_(token, tableCode) {
  return quanTriChay_(token, function (ss) { return xoaBang_(ss, String(tableCode || '').trim()); });
}

function xuLyQtLuuBang_(token, tableCode, caiDat) {
  return quanTriChay_(token, function (ss) { return luuBang_(ss, String(tableCode || '').trim(), caiDat); });
}

function xuLyQtKiemMau_(token, tableCode) {
  return quanTriChay_(token, function (ss) {
    var ma = String(tableCode || '').trim(), kq = kiemMauBang_(ss, ma);
    if (kq.ok) kq.du = kiemDuFileBang_(ss, ma);   // chỉ nút Kiểm tra bảng — mở từng file, chậm
    return kq;
  });
}
