// ============================================================
// bcsnn · gas/TongHop.js
// Vai trò  : Tổng hợp kỳ — gom số tab kỳ ở mọi file đơn vị về tab kỳ cùng tên ở file tổng
// Lớp      : gas — gọi bởi: Code.js · gọi: KyBaoCao.js, DangNhap.js, PhanQuyen.js
// Phiên bản: 0.5.0 · Cập nhật: 10/10/2026 20:10
// ============================================================
// File tổng chỉ xem: số nhập ở file đơn vị, tổng hợp gom MỘT CHIỀU về file tổng (thiết kế 4.4).
//   Cộng (aggregateType 'tong'): mỗi ô nhập của dòng mẫu = tổng số của các đơn vị có dòng đó
//     (dòng 'all' → mọi đơn vị); ô không đơn vị nào ghi số mà có chữ → ghép "mã: chữ" từng dòng.
//   Ghép ('ghep'): dòng mẫu mang mã đơn vị → điền ô nhập từ dòng tương ứng của đơn vị; dòng 'all'
//     → mỗi đơn vị một dòng; dòng đơn vị tự thêm → chèn sau dòng cuối của đơn vị đó. Bảng tự
//     nhập dòng: nối dòng có chữ của mọi đơn vị theo thứ tự tab File.
//   Ghép cột ('cot', b11): dòng = dòng mẫu, mỗi đơn vị một cụm cột (byUnitCols, trống = inputCols),
//     tiêu đề 2 dòng (tên đơn vị gộp ô · tên cột), chỉ giá trị. Mẫu có cột "Đơn vị chủ trì" → thêm tab
//     mỗi đơn vị Quản lý báo cáo của bảng, chỉ dòng ghi mã của nó (ghi đè mỗi lần tổng hợp).
// Khớp dòng đơn vị ↔ dòng mẫu theo chữ ở cột khung (như kỳ Cập nhật — KyBaoCao.js cotKhung_).
// Chỉ ghi ô nhập (cột nhập × dòng nhập, trừ dòng khoá); ô công thức giữ công thức của mẫu.
// Dòng đơn vị tự thêm: chép GIÁ TRỊ (công thức file đơn vị có thể khác vùng → khác dấu ngăn);
// cột công thức dùng công thức của dòng mẫu đứng trước nó (R1C1 — cùng dòng).
// Tab kỳ ở file tổng dựng lại mỗi lần (chép tab mẫu) → bấm lại an toàn; công thức ở tab khác
// trỏ vào tab kỳ sẽ thành #REF!. Cài đặt bảng aggregateKeep: giaTri → xong thì đổi mọi công thức của tab
// thành giá trị · congThuc (mặc định) ở bảng Cộng → ô cột số = N(IMPORTRANGE(file đơn vị))+… , tự cập nhật;
// file tổng tự được "Cho phép truy cập" từng file đơn vị (choPhepNhapTu_).
// Theo lô: mỗi lần đọc tối đa KY_MS_TOI_DA, cất từng đơn vị vào CacheService (6 giờ), trả tiepTu;
// đọc xong hết mới ghi file tổng (đọc đã lâu thì để lần gọi sau ghi).

var TH_NHAN_CHU_TRI = 'Đơn vị chủ trì';
var TH_MAU_KHOI = ['#DDEBF7', '#E2EFDA'];   // nền tiêu đề cụm cột đơn vị, xen kẽ
var TH_MAU_NHAN = '#E7E6E6';
var TH_CACHE_GIAY = 21600;
var TH_CACHE_BYTE = 99000;   // CacheService: tối đa 100 KB mỗi khoá

// ---------- Hàm thuần (kiểm bằng Node: kiem-thu/kiem-gas-tong-hop.mjs) ----------

/** Ô ngày không qua được JSON (bộ đệm) → {d: ms}; đọc lại thành Date. */
function luuGiaTri_(v) {
  return Object.prototype.toString.call(v) === '[object Date]' ? { d: v.getTime() } : v;
}

function docGiaTri_(v) {
  return v && typeof v === 'object' && typeof v.d === 'number' ? new Date(v.d) : v;
}

/** Một dòng đủ soCot ô (thiếu thì thêm ''). */
function duCot_(hang, soCot) {
  var kq = (hang || []).slice(0, soCot);
  while (kq.length < soCot) kq.push('');
  return kq;
}

/** Dòng có chữ ngoài cột A (chữ hiển thị). */
function coChuDong_(hienThi) {
  return (hienThi || []).slice(1).join('').trim() !== '';
}

/** Dòng mẫu có ô nhập: dòng khai ở inputRows (trống = mọi dòng dữ liệu), trừ lockedRows. */
function dongNhapMau_(caiDat, dongTieuDe, dongCuoi) {
  var khoa = docDanhSachDong_(caiDat.lockedRows) || [];
  var khai = docDanhSachDong_(caiDat.inputRows) || khoangSo_(dongTieuDe + 1, dongCuoi);
  return khai.filter(function (d) { return d > dongTieuDe && d <= dongCuoi && khoa.indexOf(d) < 0; });
}

/**
 * Khớp dòng tab kỳ của một đơn vị với dòng mẫu giao cho nó — tham lam theo thứ tự, như
 * ghepDongCapNhat_ (cột khung trống thì mọi dấu bằng nhau → khớp theo vị trí).
 * @param {Array<{dong, dau}>} dauMau — dòng mẫu giữ lại cho đơn vị
 * @param {Array<{dau, coChu}>} dongDv — phần tử i = dòng thứ i dưới tiêu đề của tab đơn vị
 * @returns {{anhXa: Object, thua: Array<number>}} anhXa: dòng mẫu → i · thua: dòng có chữ không khớp
 */
function khopDongDv_(dauMau, dongDv) {
  var daDung = {}, anhXa = {}, thua = [];
  dauMau.forEach(function (m) {
    for (var i = 0; i < dongDv.length; i++) {
      if (!daDung[i] && dongDv[i].dau === m.dau) {
        daDung[i] = true;
        anhXa[m.dong] = i;
        return;
      }
    }
  });
  dongDv.forEach(function (d, i) { if (!daDung[i] && d.coChu) thua.push(i); });
  return { anhXa: anhXa, thua: thua };
}

/**
 * Bảng Ghép: thứ tự dòng dữ liệu của tab kỳ file tổng.
 * @param {Array<string>} cotA — cột A mẫu; dòng dữ liệu = dongTieuDe+1 .. cotA.length
 * @param {Array<{ma, anhXa, thua}>} dsDv — đơn vị đọc được, theo thứ tự tab File
 * @returns {Array<{mau, dv, i, moi}>} mau: dòng mẫu lấy khung + định dạng · dv: chỉ số trong dsDv
 *   (-1 = giữ nguyên dòng mẫu) · i: dòng thứ i của đơn vị · moi: dòng đơn vị tự thêm
 */
function keHoachGhep_(cotA, dongTieuDe, laTach, dsDv) {
  var ra = [], theoMa = {};
  dsDv.forEach(function (d, k) { theoMa[d.ma] = k; });
  for (var dong = dongTieuDe + 1; laTach && dong <= cotA.length; dong++) {
    var ma = String(cotA[dong - 1]).trim(), co = false;
    if (ma === MA_MOI_DON_VI) {
      dsDv.forEach(function (d, k) {
        if (d.anhXa[dong] !== undefined) { ra.push({ mau: dong, dv: k, i: d.anhXa[dong] }); co = true; }
      });
    } else if (theoMa[ma] !== undefined && dsDv[theoMa[ma]].anhXa[dong] !== undefined) {
      ra.push({ mau: dong, dv: theoMa[ma], i: dsDv[theoMa[ma]].anhXa[dong] });
      co = true;
    }
    if (!co) ra.push({ mau: dong, dv: -1 });
  }
  dsDv.forEach(function (d, k) {
    if (!d.thua.length) return;
    var sau = -1;
    ra.forEach(function (r, j) { if (r.dv === k) sau = j; });
    var mauDinhDang = sau >= 0 ? ra[sau].mau : dongTieuDe + 1;
    var them = d.thua.map(function (i) { return { mau: mauDinhDang, dv: k, i: i, moi: true }; });
    ra = sau >= 0 ? ra.slice(0, sau + 1).concat(them, ra.slice(sau + 1)) : ra.concat(them);
  });
  // Google không cho xoá hết dòng dưới tiêu đề → còn ít nhất một dòng mẫu
  if (!ra.length && cotA.length > dongTieuDe) ra.push({ mau: dongTieuDe + 1, dv: -1 });
  return ra;
}

/**
 * Bảng Ghép: giá trị + công thức (R1C1, '' = không có) của khối dòng dữ liệu tab kỳ file tổng.
 * @param {{gt, ct, dongTieuDe, soCot}} mau — gt / ct: dòng dữ liệu của mẫu (phần tử 0 = dòng dongTieuDe+1)
 * @param {Array<{ma, hang}>} dsDv — hang[i]: giá trị (đủ cột, đã luuGiaTri_) dòng i của đơn vị
 */
function khoiGhep_(ra, mau, dsDv, cotNhap, dongNhap) {
  var gt = [], ct = [];
  ra.forEach(function (r) {
    var j = r.mau - mau.dongTieuDe - 1;
    var hang = duCot_(mau.gt[j], mau.soCot), cth = duCot_(mau.ct[j], mau.soCot);
    if (r.dv >= 0) {
      var dv = dsDv[r.dv], goc = duCot_(dv.hang[r.i], mau.soCot);
      if (r.moi) {
        // giá trị của đơn vị; cột công thức (không phải cột nhập) lấy công thức dòng mẫu gần nhất
        hang = goc;
        cth = cth.map(function (f, c) { return cotNhap.indexOf(c + 1) < 0 ? f : ''; });
      } else if (dongNhap.indexOf(r.mau) >= 0) {
        cotNhap.forEach(function (c) { if (!cth[c - 1]) hang[c - 1] = goc[c - 1]; });
      }
      hang[0] = dv.ma;
      cth[0] = '';
    }
    gt.push(hang);
    ct.push(cth);
  });
  return { gt: gt, ct: ct, boQua: 0 };
}

function chuO_(v) {
  if (Object.prototype.toString.call(v) !== '[object Date]') return String(v);
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  return hai(v.getDate()) + '/' + hai(v.getMonth() + 1) + '/' + v.getFullYear();
}

/**
 * Bảng Cộng: giữ nguyên dòng mẫu; mỗi ô nhập (không có công thức ở mẫu) = tổng số các đơn vị có
 * dòng đó. Không đơn vị nào ghi số mà có chữ → "mã: chữ" mỗi đơn vị một dòng; chữ y như ô mẫu
 * (tên chỉ tiêu chép xuống, đơn vị không sửa) thì bỏ. boQua = ô chữ bị bỏ vì đơn vị khác ghi số.
 */
function khoiTong_(mau, dsDv, cotNhap, dongNhap, lienKet) {
  var gt = [], ct = [], boQua = 0;
  var cotSo = lienKet ? cotCoSo_(mau, dsDv, cotNhap, dongNhap) : [];
  (mau.gt || []).forEach(function (dongGt, j) {
    var dong = mau.dongTieuDe + 1 + j;
    var hang = duCot_(dongGt, mau.soCot), cth = duCot_(mau.ct[j], mau.soCot);
    if (dongNhap.indexOf(dong) >= 0) {
      cotNhap.forEach(function (c) {
        if (cth[c - 1]) return;
        var tong = 0, coSo = false, chu = [], nguon = [], chuMau = chuO_(hang[c - 1]).trim();
        dsDv.forEach(function (d) {
          var i = d.anhXa[dong];
          if (i === undefined) return;
          nguon.push({ fileId: d.fileId, dong: d.dongTieuDe + 1 + Number(i) });
          var v = docGiaTri_(duCot_(d.hang[i], mau.soCot)[c - 1]);
          if (typeof v === 'number') { tong += v; coSo = true; }
          else if (v !== '' && v !== null && v !== undefined && chuO_(v).trim() !== chuMau) chu.push(d.ma + ': ' + chuO_(v));
        });
        if (coSo) { hang[c - 1] = Math.round(tong * 1e9) / 1e9; boQua += chu.length; }
        else if (chu.length) hang[c - 1] = chu.join('\n');
        if (cotSo.indexOf(c) >= 0 && nguon.length) cth[c - 1] = congThucLienKet_(nguon, c, lienKet.tenKy, lienKet.ngan);
      });
    }
    gt.push(hang);
    ct.push(cth);
  });
  return { gt: gt, ct: ct, boQua: boQua };
}

/** Cột nhập là cột số: có đơn vị ghi số ở ô nhập nào đó của cột (cột chữ giữ cách ghép "mã: chữ"). */
function cotCoSo_(mau, dsDv, cotNhap, dongNhap) {
  return cotNhap.filter(function (c) {
    return dsDv.some(function (d) {
      return dongNhap.some(function (dong) {
        var i = d.anhXa[dong];
        return i !== undefined && typeof docGiaTri_(duCot_(d.hang[i], mau.soCot)[c - 1]) === 'number';
      });
    });
  });
}

/**
 * Bảng Cộng, cài đặt "Công thức trỏ file đơn vị": ô tổng = cộng ô cùng chỗ ở tab kỳ từng file đơn vị.
 * N() đổi ô trống / chữ thành 0. Viết R1C1 được vì địa chỉ nằm trong chuỗi. ngan: ';' (vùng vi) hoặc ','.
 * @param {Array<{fileId, dong}>} nguon — dòng (số dòng Sheet) của ô ở từng file đơn vị
 */
function congThucLienKet_(nguon, cot, tenKy, ngan) {
  return '=' + nguon.map(function (n) {
    return 'N(IMPORTRANGE("' + n.fileId + '"' + ngan + '"\'' + tenKy + '\'!' + chuCot_(cot) + n.dong + '"))';
  }).join('+');
}

/** Dòng mẫu của đơn vị không tìm thấy ở tab kỳ của nó + dòng đơn vị không khớp mẫu (bảng Cộng). */
function demKhongKhop_(cotA, dongTieuDe, laTach, laTong, dsDv) {
  var n = 0;
  dsDv.forEach(function (d) {
    if (laTach) n += dongGiuLai_(cotA, dongTieuDe, d.ma, true).filter(function (dong) { return d.anhXa[dong] === undefined; }).length;
    if (laTong) n += d.thua.length;
  });
  return n;
}

/**
 * Bảng Ghép cột: mỗi đơn vị một cụm cột (cột cotTrai của mẫu), không cộng. Dòng = dòng dữ liệu
 * của mẫu; cột nhãn = cột khung trừ cột A. Đơn vị chưa đọc được (du null) → ô trống.
 * Tiêu đề: cột nhãn ghi ở dau1 (gộp dọc 2 dòng) · cụm đơn vị: tên ở dau1 (gộp ngang), tên cột ở dau2.
 * @param {Array<{ma, ten, du}>} dsDv — mọi đơn vị được giao, theo thứ tự danh mục
 * @returns {{dau1, dau2, gt: Array<Array>, cotNhan: Array<number>, khoi: Array<{tu, so}>}} tu: cột (từ 1) đầu cụm
 */
function bangTheoDonVi_(mau, dsDv, cotTrai) {
  var cotNhan = mau.cotKhung.filter(function (c) { return c > 1 && cotTrai.indexOf(c) < 0; });
  var tdMau = mau.hienThi[mau.dongTieuDe - 1] || [];
  var dau1 = cotNhan.map(function (c) { return tdMau[c - 1] || ''; }), dau2 = cotNhan.map(function () { return ''; });
  var khoi = [];
  dsDv.forEach(function (d) {
    khoi.push({ tu: dau1.length + 1, so: cotTrai.length });
    cotTrai.forEach(function (c, k) { dau1.push(k ? '' : d.ten); dau2.push(tdMau[c - 1] || ''); });
  });
  var gt = mau.gt.map(function (dongGt, j) {
    var dong = mau.dongTieuDe + 1 + j;
    var hang = cotNhan.map(function (c) { return dongGt[c - 1] === undefined ? '' : dongGt[c - 1]; });
    dsDv.forEach(function (d) {
      var i = d.du ? d.du.anhXa[dong] : undefined;
      var goc = i === undefined ? null : duCot_(d.du.hang[i], mau.soCot);
      cotTrai.forEach(function (c) { hang.push(goc ? docGiaTri_(goc[c - 1]) : ''); });
    });
    return hang;
  });
  return { dau1: dau1, dau2: dau2, gt: gt, cotNhan: cotNhan, khoi: khoi };
}

/** Cột nhãn (số cột mẫu) có tiêu đề "Đơn vị chủ trì" → 0 nếu mẫu không có. */
function cotChuTri_(mau, cotNhan) {
  var tdMau = mau.hienThi[mau.dongTieuDe - 1] || [];
  var nhan = TH_NHAN_CHU_TRI.toLowerCase();
  return cotNhan.filter(function (c) { return String(tdMau[c - 1] || '').trim().toLowerCase() === nhan; })[0] || 0;
}

/**
 * Cột (số từ 1, trong dsCot) mà mọi ô của các dòng gt là chữ — ghi lại bằng setValues phải đặt kiểu
 * chữ trước, kẻo Sheet đổi '1.1.1' thành ngày. Cột có số / ngày giữ nguyên.
 */
function cotToanChu_(gt, dsCot) {
  return dsCot.filter(function (c) {
    return gt.length && gt.every(function (r) { return typeof docGiaTri_(r[c - 1]) === 'string'; });
  });
}

/** Dòng của bảng Ghép cột có ô cột Đơn vị chủ trì (cột mẫu cotChuTri) = ma. */
function locChuTri_(bang, cotChuTri, ma) {
  var k = bang.cotNhan.indexOf(cotChuTri);
  if (k < 0) return [];
  return bang.gt.filter(function (h) { return String(h[k]).trim() === ma; });
}

// ---------- Chạm Drive / Sheet ----------

/** Khoá cache theo ID file tổng (không theo mã bảng — hai lĩnh vực có thể trùng mã bảng). */
function khoaCacheTongHop_(templateFileId, tenKy, ma) {
  return 'th|' + templateFileId + '|' + tenKy + '|' + ma;
}

/** Đọc tab đầu file tổng: cột A (bù tới dataRows như dungTabKy_), giá trị, công thức R1C1, cột khung. */
function docMauTongHop_(tabMau, caiDat) {
  var soCot = Math.max(tabMau.getLastColumn(), 1);
  var cotA = tabMau.getRange(1, 1, Math.max(tabMau.getLastRow(), 1), 1).getDisplayValues().map(function (d) { return d[0]; });
  var dongTieuDe = timDongTieuDe_(cotA);
  if (!dongTieuDe) throw new Error('File tổng: không có dòng nào ô A ghi "' + NHAN_COT_A + '"');
  var soDong = cotA.length;
  if (caiDat.sourceType !== 'gopTach') soDong = Math.max(soDong, dongTieuDe + (Number(caiDat.dataRows) || 0));
  soDong = Math.min(soDong, tabMau.getMaxRows());
  var vung = tabMau.getRange(1, 1, soDong, soCot);
  var hienThi = vung.getDisplayValues(), ct = vung.getFormulasR1C1();
  return { tab: tabMau, soCot: soCot, dongTieuDe: dongTieuDe, hienThi: hienThi,
    cotA: hienThi.map(function (d) { return d[0]; }),
    gt: vung.getValues().slice(dongTieuDe), ct: ct.slice(dongTieuDe),
    cotKhung: cotKhung_(caiDat, ct.slice(dongTieuDe), soCot) };
}

/** Đọc tab kỳ của một file đơn vị → {ma, anhXa, thua, hang} (chỉ cất dòng khớp + dòng thừa) hoặc {ma, thieu}. */
function docDonViTongHop_(file, tenKy, mau, caiDat, ma) {
  var tab = file.getSheetByName(tenKy);
  if (!tab) return { ma: ma, thieu: true };
  var soCot = Math.min(mau.soCot, tab.getMaxColumns()), soDong = Math.max(tab.getLastRow(), 1);
  var dongTieuDe = timDongTieuDe_(tab.getRange(1, 1, soDong, 1).getDisplayValues().map(function (d) { return d[0]; }));
  if (!dongTieuDe) throw new Error('tab ' + tenKy + ' không có dòng nào ô A ghi "' + NHAN_COT_A + '"');
  var vung = soDong > dongTieuDe ? tab.getRange(dongTieuDe + 1, 1, soDong - dongTieuDe, soCot) : null;
  var hienThi = vung ? vung.getDisplayValues() : [], gt = vung ? vung.getValues() : [];
  var laTach = caiDat.sourceType === 'gopTach';
  var cotKhung = mau.cotKhung.filter(function (c) { return c <= soCot; });
  var khop = khopDongDv_(
    laTach ? dongGiuLai_(mau.cotA, mau.dongTieuDe, ma, true).map(function (d) {
      return { dong: d, dau: dauDong_(mau.hienThi[d - 1] || [], cotKhung, ma) };
    }) : [],
    hienThi.map(function (r) { return { dau: laTach ? dauDong_(r, cotKhung, ma) : '', coChu: coChuDong_(r) }; }));
  var hang = {};
  Object.keys(khop.anhXa).map(function (k) { return khop.anhXa[k]; }).concat(khop.thua).forEach(function (i) {
    hang[i] = duCot_(gt[i], mau.soCot).map(luuGiaTri_);
  });
  return { ma: ma, dongTieuDe: dongTieuDe, anhXa: khop.anhXa, thua: khop.thua, hang: hang };
}

/**
 * Cho file tổng đọc file đơn vị qua IMPORTRANGE — thay người bấm "Cho phép truy cập" (Google đòi
 * cho từng cặp file, kể cả cùng chủ). Điểm gọi này Google không ghi trong tài liệu; gọi lại vô hại.
 */
function choPhepNhapTu_(idTong, idDv) {
  var res = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + idTong +
    '/externaldata/addimportrangepermissions?donorDocId=' + idDv,
    { method: 'post', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('file tổng chưa được phép đọc file này (mã ' + res.getResponseCode() + ')');
}

/** Dựng lại tab kỳ ở file tổng (chép tab mẫu), ghi khối dòng dữ liệu; chiGiaTri → mọi ô công thức của tab thành giá trị. */
function ghiTabTong_(fileTong, mau, tenKy, ra, khoi, laGhep, chiGiaTri) {
  var tab = dungTabTong_(fileTong, mau, tenKy, ra, khoi, laGhep);
  if (!chiGiaTri) return;
  SpreadsheetApp.flush();   // công thức tính xong rồi mới chép giá trị
  var vung = tab.getDataRange();
  vung.copyTo(vung, SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
}

function dungTabTong_(fileTong, mau, tenKy, ra, khoi, laGhep) {
  var cu = fileTong.getSheetByName(tenKy);
  if (cu && cu.getSheetId() !== mau.tab.getSheetId()) fileTong.deleteSheet(cu);
  taoTabKyTong_(fileTong, tenKy);
  var tab = fileTong.getSheetByName(tenKy);
  var dau = mau.dongTieuDe + 1, soMau = mau.gt.length, soRa = khoi.gt.length, soCot = mau.soCot;
  if (soRa > soMau) tab.insertRowsAfter(mau.dongTieuDe + soMau, soRa - soMau);
  else if (soRa < soMau) tab.deleteRows(dau + soRa, soMau - soRa);
  if (!soRa) return tab;
  // Định dạng theo dòng mẫu nguồn — mỗi đoạn dòng mẫu liên tiếp chép một lần; đoạn vẫn ở
  // đúng chỗ cũ của tab mẫu thì đã đúng định dạng, bỏ qua
  for (var j = 0; laGhep && j < ra.length; ) {
    var k = j;
    while (!ra[j].moi && k + 1 < ra.length && !ra[k + 1].moi && ra[k + 1].mau === ra[k].mau + 1) k++;
    if (ra[j].moi || ra[j].mau !== dau + j) {
      mau.tab.getRange(ra[j].mau, 1, k - j + 1, soCot)
        .copyTo(tab.getRange(dau + j, 1, k - j + 1, soCot), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }
    j = k + 1;
  }
  cotToanChu_(khoi.gt, mau.cotKhung).forEach(function (c) { tab.getRange(dau, c, soRa, 1).setNumberFormat('@'); });
  tab.getRange(dau, 1, soRa, soCot).setValues(khoi.gt.map(function (r) { return r.map(docGiaTri_); }));
  // Công thức: mỗi cột, mỗi đoạn ô có công thức liên tiếp một lần ghi
  for (var c = 0; c < soCot; c++) {
    for (var a = 0; a < soRa; ) {
      if (!khoi.ct[a][c]) { a++; continue; }
      var b = a;
      while (b + 1 < soRa && khoi.ct[b + 1][c]) b++;
      tab.getRange(dau + a, c + 1, b - a + 1, 1).setFormulasR1C1(khoi.ct.slice(a, b + 1).map(function (r) { return [r[c]]; }));
      a = b + 1;
    }
  }
  return tab;
}

/**
 * Ghi đè tab Ghép cột: dòng 1 tiêu đề, dòng 2 tên đơn vị (gộp ngang mỗi cụm, nền xen kẽ, kẻ khung
 * cụm tới dòng cuối), dòng 3 tên cột, dữ liệu từ dòng 4; cột nhãn gộp dọc dòng 2–3. Chỉ giá trị —
 * xem trên điện thoại / ứng dụng như trên máy tính.
 */
function ghiTabCot_(tab, mau, tieuDe, bang, dsDong) {
  tab.setFrozenRows(0);
  tab.setFrozenColumns(0);
  tab.getRange(1, 1, tab.getMaxRows(), tab.getMaxColumns()).breakApart();
  tab.clear();
  var soNhan = bang.cotNhan.length, soCot = Math.max(bang.dau1.length, 1), soDong = 3 + Math.max(dsDong.length, 1);
  if (tab.getMaxColumns() < soCot) tab.insertColumnsAfter(tab.getMaxColumns(), soCot - tab.getMaxColumns());
  if (tab.getMaxRows() < soDong) tab.insertRowsAfter(tab.getMaxRows(), soDong - tab.getMaxRows());
  tab.getRange(1, 1).setValue(tieuDe).setFontWeight('bold').setFontSize(12);
  tab.getRange(2, 1, 2, soCot).setValues([bang.dau1, bang.dau2]).setFontWeight('bold').setWrap(true)
    .setVerticalAlignment('middle').setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#999999', SpreadsheetApp.BorderStyle.SOLID);
  bang.cotNhan.forEach(function (c, k) {
    tab.getRange(2, k + 1, 2, 1).merge().setBackground(TH_MAU_NHAN);
    tab.setColumnWidth(k + 1, mau.tab.getColumnWidth(c));
  });
  bang.khoi.forEach(function (kh) { if (kh.so > 1) tab.getRange(2, kh.tu, 1, kh.so).merge(); });
  var a1 = function (kh, den) { return chuCot_(kh.tu) + '2:' + chuCot_(kh.tu + kh.so - 1) + den; };
  TH_MAU_KHOI.forEach(function (mauNen, x) {
    var ds = bang.khoi.filter(function (kh, i) { return i % 2 === x; }).map(function (kh) { return a1(kh, 3); });
    if (ds.length) tab.getRangeList(ds).setBackground(mauNen);
  });
  if (bang.khoi.length) {
    tab.getRangeList(bang.khoi.map(function (kh) { return a1(kh, soDong); }))
      .setBorder(true, true, true, true, null, null, '#666666', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    tab.setColumnWidths(soNhan + 1, soCot - soNhan, 80);
  }
  cotToanChu_(dsDong, khoangSo_(1, Math.min(soNhan, soCot))).forEach(function (c) {
    tab.getRange(4, c, dsDong.length, 1).setNumberFormat('@');
  });
  if (dsDong.length) tab.getRange(4, 1, dsDong.length, soCot).setValues(dsDong).setVerticalAlignment('top');
  if (soNhan) tab.getRange(4, 1, Math.max(dsDong.length, 1), soNhan).setWrap(true);
  tab.setFrozenRows(3);
  if (soNhan < soCot) tab.setFrozenColumns(soNhan);
  return tab;
}

/** Tab kỳ của bảng Ghép cột: dựng mới tại chỗ tab cũ (chưa có thì ngay sau tab mẫu). */
function tabKyCot_(fileTong, mau, tenKy) {
  var cu = fileTong.getSheetByName(tenKy), viTri = 1;
  if (cu && cu.getSheetId() !== mau.tab.getSheetId()) {
    viTri = cu.getIndex() - 1;
    fileTong.deleteSheet(cu);
  }
  return fileTong.insertSheet(tenKy, viTri);
}

/**
 * Bảng Ghép cột: dựng tab kỳ (mỗi đơn vị một cụm cột) + tab của từng đơn vị Quản lý báo cáo quản
 * lý bảng (chỉ dòng có cột "Đơn vị chủ trì" = mã của nó; tên tab = mã đơn vị; mẫu không có cột
 * này thì thôi).
 */
function ghiGhepCot_(ss, fileTong, mau, caiDat, giao, tenKy) {
  var cotTrai = (docDanhSachCot_(String(caiDat.byUnitCols || '').trim() || String(caiDat.inputCols || '')) || [])
    .filter(function (c) { return c > 1 && c <= mau.soCot; });
  if (!cotTrai.length) throw new Error('Chưa khai cột ghép theo đơn vị');
  var dsDvTab = docTabQuanLy_(ss, 'Đơn vị'), ten = {}, thuTu = {};
  dsDvTab.slice(1).forEach(function (r, i) { ten[String(r[0]).trim()] = String(r[1] || r[0]).trim(); thuTu[String(r[0]).trim()] = i; });
  var khoa = function (g) { return khoaCacheTongHop_(caiDat.templateFileId, tenKy, g.unitCode); };
  var daCat = giao.length ? CacheService.getScriptCache().getAll(giao.map(khoa)) : {};
  var dsDv = giao.slice().sort(function (a, b) { return (thuTu[a.unitCode] || 0) - (thuTu[b.unitCode] || 0); }).map(function (g) {
    var s = daCat[khoa(g)], du = s ? JSON.parse(s) : null;
    return { ma: g.unitCode, ten: ten[g.unitCode] || g.unitCode, du: du && !du.thieu && !du.loi ? du : null };
  });
  var bang = bangTheoDonVi_(mau, dsDv, cotTrai);
  var tenBang = String(caiDat.tableName || caiDat.tableCode);
  ghiTabCot_(tabKyCot_(fileTong, mau, tenKy), mau, tenBang + ' — kỳ ' + tenKy, bang, bang.gt);
  var cotChuTri = cotChuTri_(mau, bang.cotNhan);
  var soTab = 0;
  if (cotChuTri) {
    phamViQuanLy_(dsDvTab).forEach(function (pv) {
      var dong = dsDvTab.filter(function (r) { return String(r[0]).trim() === pv.unitCode; })[0];
      if (String(dong[3]).trim() !== 'Quản lý báo cáo' || !quanLyBang_(pv, caiDat.tableCode)) return;
      var tab = fileTong.getSheetByName(pv.unitCode) || fileTong.insertSheet(pv.unitCode, fileTong.getSheets().length);
      ghiTabCot_(tab, mau, ten[pv.unitCode] + ' — ' + tenBang + ' — kỳ ' + tenKy, bang,
        locChuTri_(bang, cotChuTri, pv.unitCode));
      soTab++;
    });
  }
  return { soDonVi: dsDv.length, soTab: soTab };
}

/**
 * Tổng hợp kỳ `tenKy` của bảng: đọc file đơn vị từ thứ batDau (theo lô, cất bộ đệm), đọc xong
 * hết thì ghi tab kỳ ở file tổng. Kỳ đang mở hay đã khoá đều tổng hợp được.
 */
function tongHopKy_(ss, tableCode, tenKy, batDau) {
  var batDauLuc = Date.now();
  if (!tenKy) return { ok: false, loi: 'Ngày kỳ không hợp lệ' };
  var caiDat = caiDatBang_(ss, tableCode);
  if (!caiDat) return { ok: false, loi: 'Không tìm thấy bảng ' + tableCode };
  if (!caiDat.templateFileId) return { ok: false, loi: 'Bảng chưa có file tổng (mẫu)' };
  if (!dongKy_(docTabQuanLy_(ss, TAB_KY), tableCode, tenKy)) return { ok: false, loi: 'Không có kỳ ' + tenKy };
  var giao = giaoCuaBangKy_(docTabQuanLy_(ss, 'File'), tableCode).filter(function (g) { return g.fileId; });
  var fileTong = SpreadsheetApp.openById(caiDat.templateFileId);
  var mau = docMauTongHop_(fileTong.getSheets()[0], caiDat);
  var cache = CacheService.getScriptCache();
  var kq = { ok: true, tenKy: tenKy, laTong: caiDat.aggregateType === 'tong', laCot: caiDat.aggregateType === 'cot',
    tong: giao.length, daDoc: 0, thieuTab: 0, loi: [], tiepTu: null };
  // Bảng Cộng giữ công thức: ô số = công thức cộng thẳng từ file đơn vị (IMPORTRANGE)
  var lienKet = kq.laTong && caiDat.aggregateKeep !== TH_GIA_TRI;

  var bd = Number(batDau) || 0;
  for (var i = bd; i < giao.length; i++) {
    if (Date.now() - batDauLuc > KY_MS_TOI_DA) { kq.tiepTu = i; return kq; }
    var g = giao[i], du;
    try {
      du = docDonViTongHop_(SpreadsheetApp.openById(g.fileId), tenKy, mau, caiDat, g.unitCode);
      if (lienKet && !du.thieu) choPhepNhapTu_(caiDat.templateFileId, g.fileId);
    } catch (err) {
      du = { ma: g.unitCode, loi: true };
      kq.loi.push(g.unitCode + ': ' + String(err.message || err));
    }
    var chuoi = JSON.stringify(du);
    if (Utilities.newBlob(chuoi).getBytes().length > TH_CACHE_BYTE) {
      chuoi = JSON.stringify({ ma: g.unitCode, loi: true });
      kq.loi.push(g.unitCode + ': tab kỳ quá lớn, chưa tổng hợp được');
    } else if (du.thieu) kq.thieuTab++;
    else if (!du.loi) kq.daDoc++;
    cache.put(khoaCacheTongHop_(caiDat.templateFileId, tenKy, g.unitCode), chuoi, TH_CACHE_GIAY);
  }
  if (bd < giao.length && Date.now() - batDauLuc > KY_MS_TOI_DA / 2) { kq.tiepTu = giao.length; return kq; }

  var khoa = giao.map(function (g) { return khoaCacheTongHop_(caiDat.templateFileId, tenKy, g.unitCode); });
  var daCat = khoa.length ? cache.getAll(khoa) : {};
  var dsDv = [];
  giao.forEach(function (g, j) {
    var s = daCat[khoa[j]];
    if (!s) { kq.loi.push(g.unitCode + ': chưa đọc được (bộ đệm đã hết hạn) — bấm Tổng hợp lại'); return; }
    var du = JSON.parse(s);
    if (du.thieu || du.loi) return;
    du.fileId = g.fileId;
    dsDv.push(du);
  });

  var laTach = caiDat.sourceType === 'gopTach';
  var dongNhap = dongNhapMau_(caiDat, mau.dongTieuDe, mau.dongTieuDe + mau.gt.length);
  var cotNhap = (docDanhSachCot_(caiDat.inputCols) || []).filter(function (c) { return c > 1 && c <= mau.soCot; });
  var ra = [], khoi = { gt: mau.gt, boQua: 0 };
  if (kq.laCot) {
    var cot = ghiGhepCot_(ss, fileTong, mau, caiDat, giao, tenKy);
    kq.soTab = cot.soTab;
  } else if (kq.laTong) {
    ra = mau.gt.map(function (r, j) { return { mau: mau.dongTieuDe + 1 + j, dv: -1 }; });
    khoi = khoiTong_(mau, dsDv, cotNhap, dongNhap, lienKet
      ? { tenKy: tenKy, ngan: nganCongThuc_(fileTong) } : null);
  } else {
    ra = keHoachGhep_(mau.cotA, mau.dongTieuDe, laTach, dsDv);
    khoi = khoiGhep_(ra, mau, dsDv, cotNhap, dongNhap);
  }
  if (!kq.laCot) ghiTabTong_(fileTong, mau, tenKy, ra, khoi, !kq.laTong, caiDat.aggregateKeep === TH_GIA_TRI);
  kq.xong = true;
  kq.chiGiaTri = !kq.laCot && caiDat.aggregateKeep === TH_GIA_TRI;
  kq.lienKet = lienKet;
  kq.soDonVi = dsDv.length;
  kq.soDong = khoi.gt.length;
  kq.dongThem = ra.filter(function (r) { return r.moi; }).length;
  kq.khongKhop = demKhongKhop_(mau.cotA, mau.dongTieuDe, laTach, kq.laTong || kq.laCot, dsDv);
  kq.boQua = khoi.boQua;
  return kq;
}

// ---------- Action quản trị ----------

function xuLyQtTongHopKy_(token, tableCode, tenKy, batDau) {
  return quanTriChay_(token, function (ss) {
    return tongHopKy_(ss, String(tableCode || '').trim(), chuanHoaTenKy_(tenKy), batDau);
  });
}
