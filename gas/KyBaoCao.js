// ============================================================
// bcsnn · gas/KyBaoCao.js
// Vai trò  : Kỳ báo cáo — tạo tab kỳ ở mọi file đơn vị của một bảng (thiếu file
//            thì tạo file), khoá / mở khoá / xoá kỳ, tự khoá theo ngày; sổ kỳ ở tab "Kỳ" của Sheet quản lý
// Lớp      : gas — gọi bởi: Code.js, QuanLyBang.js, B04.js (thử), trigger theo giờ (tuKhoaKy)
//            · gọi: PhanQuyen.js, DangNhap.js, QuanLyBang.js (kiemMauBang_), Code.js (layQuanLyId_, DS_LINH_VUC)
// Phiên bản: 0.7.1 · Cập nhật: 10/10/2026 20:10
// ============================================================
// Tab kỳ = chép tab đầu của file tổng (templateFileId), tách dòng theo mã đơn
// vị, khoá theo cài đặt bảng (KIEN-TRUC.md mục 6). Tên tab dd.mm.yyyy.
// File tổng cũng có tab kỳ (chép tab mẫu, đặt sau tab mẫu) — chỗ gom số ở bước tổng hợp.
// Bảng kiểu kỳ "Cập nhật": chép tab kỳ trước của chính file đơn vị (giữ số), dòng
// mẫu mới (so theo cột khung) chèn sau khối dòng của Sở. Cột A + hiddenCols luôn ẩn.
// Khoá kỳ = khoá cả tab + ẩn tab. Tab vốn đã có bảo vệ cả tab (chừa vùng nhập)
// thì vùng nhập cũ cất vào developer metadata của tab → Mở khoá trả lại đúng.
// 168 file không xong trong một lần chạy (6 phút) → mỗi lần chạy tối đa
// KY_MS_TOI_DA rồi trả `tiepTu`; trang gọi lại với batDau = tiepTu tới khi null.
// Tự khoá (thiết kế mục 7): mỗi kỳ có ngày tự khoá (tab Kỳ cột lockDate), mặc định
// = ngày `lockDay` của bảng đầu tiên sau ngày kỳ. Trigger theo giờ gọi tuKhoaKy —
// chủ dự án tự cài trong trình soạn (không dùng ScriptApp → không thêm quyền mới); một trigger
// chạy lần lượt Sheet quản lý của mọi lĩnh vực, chỗ dừng cất riêng theo từng file.
// Bảng công khai: tạo / khoá / mở / xoá kỳ bật–tắt luôn link công khai từng file — bảng
// không còn kỳ mở thì tắt (PhanQuyen.js laCongKhai_).

var NHAN_COT_A = 'Mã đơn vị';
var MA_MOI_DON_VI = 'all';      // cột A của mẫu ghi 'all' = dòng giao cho mọi đơn vị
var TIEN_TO_KHOA_KY = 'Khoá kỳ';
var META_KHOA_KY = 'bcsnn_khoaKy';
var TAB_KY = 'Kỳ';
var KY_MS_TOI_DA = 240000;
var TU_KHOA_TIEP = 'TU_KHOA_TIEP';   // Script Properties (+ '_' + ID Sheet quản lý): chỗ dừng của lần tự khoá trước
// Kiểu kỳ (cài đặt bảng periodMode): nhập mới = khung từ file tổng, ô nhập trống ·
// cập nhật = chép tab kỳ trước của chính file đơn vị (giữ số), thêm dòng mẫu mới
var KY_NHAP_MOI = 'nhapMoi';
var KY_CAP_NHAT = 'capNhat';
// Tổng hợp (cài đặt bảng aggregateKeep — TongHop.js): tab kỳ file tổng giữ công thức (bảng Cộng: ô số = công
// thức cộng thẳng từ file đơn vị), hay chỉ giá trị
var TH_CONG_THUC = 'congThuc';
var TH_GIA_TRI = 'giaTri';

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

/** Tên các tab của file đơn vị → tab kỳ gần nhất TRƯỚC kỳ tenKy ('' = không có). */
function kyTruoc_(dsTen, tenKy) {
  var moc = soNgay_(tenKy), tot = '', soTot = 0;
  dsTen.forEach(function (ten) {
    var n = soNgay_(ten);
    if (n && n < moc && n > soTot) { soTot = n; tot = ten; }
  });
  return tot;
}

/** Cột ẩn ở file đơn vị: luôn có cột A + cột khai ở hiddenCols (bỏ cột quá soCot) → [[a, b]]. */
function cotAn_(caiDat, soCot) {
  return gomDoan_([1].concat((docDanhSachCot_(caiDat.hiddenCols) || []).filter(function (c) { return c > 1 && c <= soCot; })));
}

/**
 * Cột khung để so dòng mẫu với dòng kỳ trước: không phải cột nhập, không có công thức ở
 * dòng dữ liệu nào của mẫu (công thức ra số khác nhau mỗi kỳ).
 * @param {Array<Array>} congThuc — getFormulas() các dòng dữ liệu của mẫu
 */
function cotKhung_(caiDat, congThuc, soCot) {
  var nhap = docDanhSachCot_(caiDat.inputCols) || [];
  return khoangSo_(1, soCot).filter(function (c) {
    return nhap.indexOf(c) < 0 && !congThuc.some(function (r) { return String(r[c - 1] || '') !== ''; });
  });
}

/** Dấu của một dòng = chữ ở các cột khung (cột A: 'all' → mã đơn vị, như ở file đơn vị). */
function dauDong_(hienThi, cotKhung, maDonVi) {
  return cotKhung.map(function (c) {
    var s = String(hienThi[c - 1] === undefined || hienThi[c - 1] === null ? '' : hienThi[c - 1]).trim();
    return c === 1 && s === MA_MOI_DON_VI ? maDonVi : s;
  }).join('␟');
}

/**
 * Kỳ kiểu Cập nhật, bảng Sở giao dòng: dòng mẫu của đơn vị khớp dấu với một dòng kỳ trước
 * → dùng dòng đó (giữ số cũ); không khớp → dòng mới, chèn ngay sau dòng cuối khớp được
 * (trước các dòng đơn vị tự thêm). Dòng kỳ trước không khớp mẫu nào thì giữ nguyên.
 * @param {Array<{dong, dau}>} dauMau — dòng mẫu giữ lại cho đơn vị, theo thứ tự
 * @param {Array<string>} dauTruoc — dấu dòng dữ liệu kỳ trước; phần tử i = dòng dongTieuDe + 1 + i
 * @returns {{anhXa: Object, dongMoi: Array<number>, chenSau: number}} anhXa: dòng mẫu → dòng tab kỳ mới
 */
function ghepDongCapNhat_(dauMau, dauTruoc, dongTieuDe) {
  var daDung = {}, anhXa = {}, dongMoi = [], chenSau = dongTieuDe;
  dauMau.forEach(function (m) {
    for (var i = 0; i < dauTruoc.length; i++) {
      if (!daDung[i] && dauTruoc[i] === m.dau) {
        daDung[i] = true;
        anhXa[m.dong] = dongTieuDe + 1 + i;
        chenSau = Math.max(chenSau, dongTieuDe + 1 + i);
        return;
      }
    }
    dongMoi.push(m.dong);
  });
  // dòng khớp đều ≤ chenSau nên không bị đẩy xuống khi chèn
  dongMoi.forEach(function (d, j) { anhXa[d] = chenSau + 1 + j; });
  return { anhXa: anhXa, dongMoi: dongMoi, chenSau: chenSau };
}

// Dòng tab "Bảng" → đối tượng cài đặt (ô Sheet có thể là boolean hay chữ)
function docCaiDat_(tieuDe, dong) {
  var caiDat = {};
  tieuDe.forEach(function (ten, i) { caiDat[String(ten).trim()] = dong[i]; });
  caiDat.tableCode = String(caiDat.tableCode || '').trim();
  caiDat.templateFileId = String(caiDat.templateFileId || '').trim();
  caiDat.allowAddRows = caiDat.allowAddRows === true || String(caiDat.allowAddRows).trim().toUpperCase() === 'TRUE';
  var cachTh = String(caiDat.aggregateType || '').trim();
  caiDat.aggregateType = cachTh === 'tong' || cachTh === 'cot' ? cachTh : 'ghep';
  if (caiDat.aggregateType !== 'ghep') caiDat.allowAddRows = false;   // Cộng / Ghép cột: đơn vị không thêm dòng
  caiDat.noteTabs = String(caiDat.noteTabs || '').split(',')
    .map(function (t) { return t.trim(); }).filter(function (t) { return t; });
  caiDat.hiddenCols = String(caiDat.hiddenCols || '').trim();
  caiDat.periodMode = String(caiDat.periodMode || '').trim() === KY_CAP_NHAT ? KY_CAP_NHAT : KY_NHAP_MOI;
  caiDat.shareType = chuanChiaSe_(caiDat.shareType);
  caiDat.aggregateKeep = chuanGiuTongHop_(caiDat.aggregateKeep);
  return caiDat;
}

/** Ô "Khi tổng hợp" của bảng → congThuc (mặc định) · giaTri. */
function chuanGiuTongHop_(o) {
  return String(o || '').trim() === TH_GIA_TRI ? TH_GIA_TRI : TH_CONG_THUC;
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

/** Các dòng giao của một bảng trong tab File, giữ thứ tự: [{unitCode, fileId, dong, access}] (dong = số dòng Sheet). */
function giaoCuaBangKy_(dsFile, tableCode) {
  var kq = [];
  for (var i = 1; i < (dsFile || []).length; i++) {
    var uc = String(dsFile[i][0] || '').trim();
    if (uc && String(dsFile[i][1] || '').trim() === tableCode) {
      kq.push({ unitCode: uc, fileId: String(dsFile[i][2] || '').trim(), dong: i + 1, access: chuanQuyenDv_(dsFile[i][4]) });
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
  apKhoa_(tab, keHoach, caiDat);
  anCot_(tab, caiDat);
  return { tab: tab, keHoach: keHoach, soDong: giuLai.length };
}

/** Ẩn cột A + cột khai ở hiddenCols; cột khác hiện lại (cài đặt có thể đã đổi từ kỳ trước). */
function anCot_(tab, caiDat) {
  var soCot = tab.getMaxColumns();
  tab.showColumns(1, soCot);
  cotAn_(caiDat, soCot).forEach(function (d) { tab.hideColumns(d[0], d[1] - d[0] + 1); });
}

/** Khoá tab kỳ theo kế hoạch keHoachKhoa_ (tab chưa có bảo vệ nào). */
function apKhoa_(tab, keHoach, caiDat) {
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
}

/**
 * Đọc tab đầu file tổng một lần cho cả lượt tạo kỳ kiểu Cập nhật: chữ hiển thị, cột A,
 * dòng tiêu đề, cột khung (để so dòng). Bảng tự nhập dòng bù cột A tới dataRows như dungTabKy_.
 */
function docMauKy_(tabMau, caiDat) {
  var soDong = Math.max(tabMau.getLastRow(), 1), soCot = Math.max(tabMau.getLastColumn(), 1);
  var vung = tabMau.getRange(1, 1, soDong, soCot);
  var hienThi = vung.getDisplayValues();
  var cotA = hienThi.map(function (d) { return d[0]; });
  var dongTieuDe = timDongTieuDe_(cotA);
  if (!dongTieuDe) throw new Error('Mẫu ' + caiDat.tableCode + ': không có dòng nào ô A ghi "' + NHAN_COT_A + '"');
  if (caiDat.sourceType !== 'gopTach') while (cotA.length < dongTieuDe + (Number(caiDat.dataRows) || 0)) cotA.push('');
  return { tab: tabMau, soCot: soCot, hienThi: hienThi, cotA: cotA, dongTieuDe: dongTieuDe,
    cotKhung: cotKhung_(caiDat, vung.getFormulas().slice(dongTieuDe), soCot) };
}

// Kỳ kiểu Cập nhật: chép tab kỳ trước của chính file đơn vị, thêm dòng mẫu mới, khoá lại theo cài đặt
function taoTabKyCapNhat_(ss, tabTruoc, mauKy, caiDat, maDonVi, tenKy) {
  var tab = tabTruoc.copyTo(ss).setName(tenKy);
  try {
    return dungTabCapNhat_(ss, tab, mauKy, caiDat, maDonVi);
  } catch (err) {
    ss.deleteSheet(tab);   // không để lại tab dở — lần sau tạo lại được
    throw err;
  }
}

function dungTabCapNhat_(ss, tab, mauKy, caiDat, maDonVi) {
  dauTien_(ss, tab);
  if (tab.isSheetHidden()) tab.showSheet();   // kỳ trước đã khoá thì đang ẩn
  tab.getProtections(SpreadsheetApp.ProtectionType.SHEET)
    .concat(tab.getProtections(SpreadsheetApp.ProtectionType.RANGE))
    .forEach(function (p) { p.remove(); });
  var meta = metaKhoaKy_(tab);
  if (meta) meta.remove();

  var soDong = tab.getMaxRows(), soCot = tab.getMaxColumns();
  var dongTieuDe = timDongTieuDe_(tab.getRange(1, 1, soDong, 1).getDisplayValues().map(function (d) { return d[0]; }));
  if (!dongTieuDe) throw new Error('tab kỳ trước không có dòng nào ô A ghi "' + NHAN_COT_A + '"');
  var laTach = caiDat.sourceType === 'gopTach';
  var giuLai = dongGiuLai_(mauKy.cotA, mauKy.dongTieuDe, maDonVi, laTach);
  var anhXa, dongCuoi, dongThem = 0;

  if (!laTach) {
    // Bảng tự nhập dòng: dòng mẫu đều trống, dòng kỳ trước giữ nguyên vị trí
    anhXa = anhXaDong_(giuLai, dongTieuDe);
    dongCuoi = caiDat.allowAddRows ? dongTieuDe + giuLai.length : soDong;
  } else {
    var hienThi = soDong > dongTieuDe ? tab.getRange(dongTieuDe + 1, 1, soDong - dongTieuDe, soCot).getDisplayValues() : [];
    var coChu = 0;   // dòng cuối có chữ (bỏ cột A) — bảng cho thêm dòng còn dòng trống ở dưới
    hienThi.forEach(function (r, i) { if (r.slice(1).join('').trim()) coChu = i + 1; });
    var cotKhung = mauKy.cotKhung.filter(function (c) { return c <= soCot; });
    var ghep = ghepDongCapNhat_(
      giuLai.map(function (d) { return { dong: d, dau: dauDong_(mauKy.hienThi[d - 1] || [], cotKhung, maDonVi) }; }),
      hienThi.slice(0, coChu).map(function (r) { return dauDong_(r, cotKhung, maDonVi); }),
      dongTieuDe);
    if (ghep.dongMoi.length) themDongMau_(ss, tab, mauKy, ghep, maDonVi);
    anhXa = ghep.anhXa;
    dongThem = ghep.dongMoi.length;
    dongCuoi = caiDat.allowAddRows ? ghep.chenSau + dongThem : tab.getMaxRows();
  }

  var keHoach = keHoachKhoa_(caiDat, dongTieuDe, dongCuoi, anhXa, tab.getMaxColumns());
  apKhoa_(tab, keHoach, caiDat);
  anCot_(tab, caiDat);
  return { tab: tab, keHoach: keHoach, dongThem: dongThem };
}

/** Chèn dòng mẫu mới của đơn vị sau ghep.chenSau: chép tab mẫu vào file làm tab tạm rồi chép từng dòng. */
function themDongMau_(ss, tab, mauKy, ghep, maDonVi) {
  var n = ghep.dongMoi.length;
  tab.insertRowsAfter(ghep.chenSau, n);
  var tam = mauKy.tab.copyTo(ss);
  try {
    var soCot = Math.min(tam.getMaxColumns(), tab.getMaxColumns());
    ghep.dongMoi.forEach(function (dongMau, j) {
      tam.getRange(dongMau, 1, 1, soCot).copyTo(tab.getRange(ghep.chenSau + 1 + j, 1));
    });
  } finally {
    ss.deleteSheet(tam);
  }
  var vungA = tab.getRange(ghep.chenSau + 1, 1, n, 1).clearDataValidations();
  vungA.setValues(vungA.getValues().map(function (d) { return [String(d[0]).trim() === MA_MOI_DON_VI ? maDonVi : d[0]]; }));
}

/**
 * Tab kỳ trong file tổng (chỗ gom số các đơn vị ở bước tổng hợp): chép tab mẫu, đặt ngay sau
 * tab mẫu — tab mẫu luôn đứng đầu vì tạo kỳ chép tab đầu. Đã có thì thôi → true nếu vừa tạo.
 */
function taoTabKyTong_(mau, tenKy) {
  if (mau.getSheetByName(tenKy)) return false;
  var tab = mau.getSheets()[0].copyTo(mau).setName(tenKy);
  mau.setActiveSheet(tab);
  mau.moveActiveSheet(2);
  return true;
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

/** Ẩn tab kỳ đã khoá còn đang hiện — lúc khoá nó là tab hiện duy nhất nên chưa ẩn được. */
function anTabDaKhoa_(ss) {
  ss.getSheets().forEach(function (tab) {
    if (tab.isSheetHidden() || soTabDangHien_(ss) < 2) return;
    var baoVe = tab.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];
    if (baoVe && baoVe.getDescription().indexOf(TIEN_TO_KHOA_KY) === 0) tab.hideSheet();
  });
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
  var kq = { ok: true, tenKy: tenKy, hanKhoa: han, tong: giao.length, daTao: 0, fileMoi: 0, daCo: 0,
    capNhat: 0, dongThem: 0, loi: [], tiepTu: null };
  if (!Number(batDau)) {
    try { kq.tabTong = taoTabKyTong_(mau, tenKy); } catch (err) { kq.loi.push('File tổng: ' + String(err.message || err)); }
  }
  var fileMoi = [], mauKy = null;
  // Bảng công khai: kỳ vừa tạo đang mở → file đơn vị được nhập bật link công khai
  var laCK = caiDat.shareType === CHIA_SE_CONG_KHAI;
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
      if (file.getSheetByName(tenKy)) {
        if (laCK) datCongKhai_(file.getId(), laCongKhai_(caiDat.shareType, g.access, true));
        kq.daCo++;
        continue;
      }
      var truoc = caiDat.periodMode === KY_CAP_NHAT && !macDinh
        ? kyTruoc_(file.getSheets().map(function (t) { return t.getName(); }), tenKy) : '';
      if (truoc) {
        mauKy = mauKy || docMauKy_(tabMau, caiDat);
        kq.dongThem += taoTabKyCapNhat_(file, file.getSheetByName(truoc), mauKy, caiDat, g.unitCode, tenKy).dongThem;
        kq.capNhat++;
      } else {
        taoTabKy_(file, mau, caiDat, g.unitCode, tenKy);   // nhập mới, hoặc đơn vị chưa có kỳ nào
      }
      chepTabChuThich_(file, mau, caiDat);
      if (macDinh) file.deleteSheet(macDinh);
      anTabDaKhoa_(file);
      if (laCK) datCongKhai_(file.getId(), laCongKhai_(caiDat.shareType, g.access, true));
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
  // Bảng công khai: sau khi khoá / mở, bảng còn kỳ mở thì giữ link công khai, hết thì tắt
  var cd = caiDatBang_(ss, tableCode), laCK = !!cd && cd.shareType === CHIA_SE_CONG_KHAI;
  var conKyMo = !khoa || bangCoKyMo_(docKyQuanLy_(dsKy), tableCode, tenKy);
  for (var i = Number(batDau) || 0; i < giao.length; i++) {
    if (Date.now() > hetGio) { kq.tiepTu = i; break; }
    try {
      var tab = SpreadsheetApp.openById(giao[i].fileId).getSheetByName(tenKy);
      if (laCK) datCongKhai_(giao[i].fileId, laCongKhai_(cd.shareType, giao[i].access, conKyMo));
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

/**
 * Xoá kỳ: xoá tab kỳ ở mọi file đơn vị + file tổng, xong hết mới xoá dòng sổ kỳ. File đơn vị
 * không còn kỳ nào khác → thùng rác (khôi phục được ~30 ngày) + bỏ trống fileId, Tạo kỳ sau
 * tạo lại file (Google không cho file không còn tab). Tab đã xoá → bỏ qua, nên gọi lại an toàn.
 */
function xoaKy_(ss, tableCode, tenKy, batDau) {
  var hetGio = Date.now() + KY_MS_TOI_DA;
  var dsKy = tabKyQuanLy_(ss).getDataRange().getValues();
  if (!dongKy_(dsKy, tableCode, tenKy)) return { ok: false, loi: 'Không có kỳ ' + tenKy };
  // Giữ cả dòng chưa có file: bỏ trống fileId giữa chừng không làm lệch chỉ số lô sau
  var giao = giaoCuaBangKy_(docTabQuanLy_(ss, 'File'), tableCode);
  var tabFile = ss.getSheetByName('File');
  var kq = { ok: true, tenKy: tenKy, tong: giao.length, daXoa: 0, fileBo: 0, loi: [], tiepTu: null };
  // Bảng công khai: xoá kỳ mở cuối cùng → tắt link công khai của file còn lại
  var cd = caiDatBang_(ss, tableCode), laCK = !!cd && cd.shareType === CHIA_SE_CONG_KHAI;
  var conKyMo = bangCoKyMo_(docKyQuanLy_(dsKy), tableCode, tenKy);
  for (var i = Number(batDau) || 0; i < giao.length; i++) {
    if (Date.now() > hetGio) { kq.tiepTu = i; break; }
    var g = giao[i];
    if (!g.fileId) continue;
    try {
      var file = SpreadsheetApp.openById(g.fileId), tab = file.getSheetByName(tenKy);
      if (!tab) continue;
      var conKy = file.getSheets().filter(function (t) { return t.getName() !== tenKy && soNgay_(t.getName()); })
        .sort(function (a, b) { return soNgay_(b.getName()) - soNgay_(a.getName()); });
      if (conKy.length) {
        // Google không cho xoá tab hiện cuối cùng → hiện kỳ gần nhất còn lại (đã khoá thì vẫn khoá)
        if (!tab.isSheetHidden() && soTabDangHien_(file) < 2) conKy[0].showSheet();
        file.deleteSheet(tab);
        if (laCK) datCongKhai_(g.fileId, laCongKhai_(cd.shareType, g.access, conKyMo));
      } else {
        DriveApp.getFileById(g.fileId).setTrashed(true);
        tabFile.getRange(g.dong, 3, 1, 2).setValues([['', '']]);
        kq.fileBo++;
      }
      kq.daXoa++;
    } catch (err) {
      kq.loi.push(g.unitCode + ': ' + String(err.message || err));
    }
  }
  if (kq.tiepTu !== null) return kq;
  // File lỗi còn giữ tab → giữ kỳ trong sổ để bấm Xoá lại, không để tab mồ côi
  if (kq.loi.length) { kq.conSo = true; return kq; }
  try {
    var mau = cd && cd.templateFileId ? SpreadsheetApp.openById(cd.templateFileId) : null;
    var tabTong = mau && mau.getSheetByName(tenKy);
    if (tabTong && mau.getSheets()[0].getSheetId() !== tabTong.getSheetId()) mau.deleteSheet(tabTong);
  } catch (err) {
    kq.loi.push('File tổng: ' + String(err.message || err));
  }
  var tabKy = tabKyQuanLy_(ss), dong = dongKy_(tabKy.getDataRange().getValues(), tableCode, tenKy);
  if (dong) tabKy.deleteRow(dong);
  var p = PropertiesService.getScriptProperties(), khoaTiep = khoaTuKhoaTiep_(ss);
  var tiep = JSON.parse(p.getProperty(khoaTiep) || 'null');
  if (tiep && tiep.tableCode === tableCode && tiep.periodName === tenKy) p.deleteProperty(khoaTiep);
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

/** Tên Script Property cất chỗ dừng tự khoá — riêng cho Sheet quản lý của mỗi lĩnh vực. */
function khoaTuKhoaTiep_(ss) {
  return TU_KHOA_TIEP + '_' + ss.getId();
}

/**
 * Khoá lần lượt các kỳ tới ngày tự khoá (của một lĩnh vực). Hết giờ giữa chừng thì cất chỗ
 * dừng vào Script Properties — lần chạy sau (giờ sau) làm tiếp từ đó.
 */
function tuKhoaKyDenHan_(ss, homNay, hetGio) {
  var p = PropertiesService.getScriptProperties(), khoaTiep = khoaTuKhoaTiep_(ss);
  var tiep = JSON.parse(p.getProperty(khoaTiep) || 'null');
  var denHan = kyDenHan_(docKyQuanLy_(docTabQuanLy_(ss, TAB_KY)), homNay);
  var ketQua = [];
  for (var i = 0; i < denHan.length && Date.now() < hetGio; i++) {
    var k = denHan[i];
    var batDau = tiep && tiep.tableCode === k.tableCode && tiep.periodName === k.periodName ? tiep.batDau : 0;
    var kq = khoaMoKy_(ss, k.tableCode, k.periodName, true, batDau, hetGio);
    ketQua.push({ tableCode: k.tableCode, kq: kq });
    if (kq.ok && kq.tiepTu !== null) {
      p.setProperty(khoaTiep, JSON.stringify({ tableCode: k.tableCode, periodName: k.periodName, batDau: kq.tiepTu }));
      ketQua.chuaXong = true;
      return ketQua;
    }
  }
  if (Date.now() >= hetGio && ketQua.length < denHan.length) ketQua.chuaXong = true;
  else p.deleteProperty(khoaTiep);
  return ketQua;
}

/**
 * TRIGGER theo giờ — chủ dự án cài một lần: trình soạn Apps Script → Trình kích hoạt →
 * Thêm → hàm tuKhoaKy · Theo thời gian · Theo giờ · Mỗi giờ. Quản trị đang chạy việc
 * (đang giữ khoá) thì bỏ lượt này, giờ sau làm. Lần lượt mọi lĩnh vực (Code.js DS_LINH_VUC);
 * hết giờ ở lĩnh vực nào thì dừng, giờ sau làm tiếp.
 */
function tuKhoaKy() {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) return;
  try {
    var hetGio = Date.now() + KY_MS_TOI_DA;
    for (var i = 0; i < DS_LINH_VUC.length && Date.now() < hetGio; i++) {
      var id = layQuanLyId_(DS_LINH_VUC[i]);
      if (!id) continue;
      var kq = tuKhoaKyDenHan_(SpreadsheetApp.openById(id), homNay_(), hetGio);
      if (kq.length) console.log('Tự khoá ' + DS_LINH_VUC[i] + ': ' + JSON.stringify(kq));
      if (kq.chuaXong) break;
    }
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

function xuLyQtXoaKy_(token, tableCode, tenKy, batDau) {
  return quanTriChay_(token, function (ss) {
    return xoaKy_(ss, String(tableCode || '').trim(), chuanHoaTenKy_(tenKy), batDau);
  });
}

function xuLyQtKhoaKy_(token, tableCode, tenKy, khoa, batDau) {
  return quanTriChay_(token, function (ss) {
    return khoaMoKy_(ss, String(tableCode || '').trim(), chuanHoaTenKy_(tenKy), khoa === true, batDau);
  });
}
