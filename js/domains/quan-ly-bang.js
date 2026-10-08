// ============================================================
// bcsnn · js/domains/quan-ly-bang.js
// Vai trò  : Nghiệp vụ thuần mục Quản lý bảng: kiểu cột, chữ cột, mã bảng từ tên,
//            cách nhập dòng / tổng hợp, kiểu kỳ, nhãn lĩnh vực, số đơn vị có file,
//            câu báo kiểm mẫu / đủ file + tab kỳ / giao theo mã
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils (BO_DAU), config
// Phiên bản: 0.6.0 · Cập nhật: 08/10/2026 17:05
// ============================================================
// Khai báo gửi GAS (qtTaoBang) và luật kiểm ở gas/QuanLyBang.js — GAS kiểm lại,
// ở đây chỉ phục vụ giao diện.

var QUAN_LY_BANG = (function () {
  'use strict';

  var KIEU_COT = [
    { ma: 'chu', ten: 'Nhập chữ' },
    { ma: 'so', ten: 'Nhập số' },
    { ma: 'ngay', ten: 'Nhập ngày' },
    { ma: 'chon', ten: 'Chọn từ danh sách' },
    { ma: 'congThuc', ten: 'Công thức' }
  ];

  var CACH_NHAP_DONG = [
    { ma: 'docLap', ten: 'Đơn vị tự nhập dòng' },
    { ma: 'gopTach', ten: 'Sở giao dòng sẵn' }
  ];

  // Thiết kế 4.4. Bảng tổng: mọi đơn vị cùng các dòng (cột A = all) → luôn Sở giao dòng
  var CACH_TONG_HOP = [
    { ma: 'ghep', ten: 'Ghép từ các đơn vị' },
    { ma: 'tong', ten: 'Tổng các đơn vị' }
  ];

  // Kỳ mới: chép khung từ file tổng (ô nhập trống) hay chép kỳ trước của đơn vị (giữ số)
  var KIEU_KY = [
    { ma: 'nhapMoi', ten: 'Nhập mới' },
    { ma: 'capNhat', ten: 'Cập nhật từ kỳ trước' }
  ];

  /** Dòng dữ liệu đầu của mẫu dựng trên app (dòng 1 tên bảng, dòng 2 tiêu đề) */
  var DONG_DAU = 3;

  /** 1 → 'A', 28 → 'AB' */
  function chuCot(so) {
    var chu = '';
    for (var n = so; n > 0; n = Math.floor((n - 1) / 26)) chu = String.fromCharCode(65 + (n - 1) % 26) + chu;
    return chu;
  }

  /** 'Tiến độ giải ngân' → 'tien_do_giai_ngan' (tối đa 40 ký tự) */
  function maTuTen(ten) {
    return BO_DAU.boDau(ten || '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40).replace(/_+$/, '');
  }

  /** Lĩnh vực cho ô chọn, xếp theo tên: [{giaTri, nhan: 'Tên (MÃ)'}] */
  function luaChonLinhVuc(linhVuc) {
    return (linhVuc || []).slice().sort(function (a, b) { return a.groupName.localeCompare(b.groupName, 'vi'); })
      .map(function (l) {
        return { giaTri: l.groupCode, nhan: l.groupName === l.groupCode ? l.groupCode : l.groupName + ' (' + l.groupCode + ')' };
      });
  }

  /** Tên lĩnh vực theo mã (chưa có trong danh mục thì trả mã) */
  function tenLinhVuc(linhVuc, ma) {
    var l = (linhVuc || []).filter(function (x) { return x.groupCode === ma; })[0];
    return l ? l.groupName : (ma || '');
  }

  /** Số đơn vị đã có file nhập liệu của bảng (giao: [{unitCode, tableCode, coFile}]) */
  function soDonViCoFile(giao, tableCode) {
    return (giao || []).filter(function (g) { return g.tableCode === tableCode && g.coFile; }).length;
  }

  /** 'Tài chính' → 'TC' (chữ đầu mỗi từ, in hoa không dấu) — gợi ý mã lĩnh vực */
  function maLinhVucTuTen(ten) {
    return BO_DAU.boDau(ten || '').split(/[^a-z0-9]+/).filter(Boolean)
      .map(function (t) { return t.charAt(0); }).join('').toUpperCase().slice(0, 15);
  }

  /** Ô phụ của kiểu cột: công thức / các lựa chọn / không có */
  function oPhu(kieu) {
    if (kieu === 'congThuc') return { nhan: 'Công thức', goiY: '=IFERROR(D' + DONG_DAU + '/C' + DONG_DAU + ';"")' };
    if (kieu === 'chon') return { nhan: 'Các lựa chọn', goiY: 'Đang làm, Đã xong' };
    return null;
  }

  /** Kết quả kiểm mẫu → { hopLe, dong: ['Chỗ: lỗi — cách sửa'] } */
  function tomTatKiem(kiem) {
    return {
      hopLe: !(kiem && kiem.length),
      dong: (kiem || []).map(function (l) { return l.cho + ': ' + l.loi + ' — ' + l.cach; })
    };
  }

  var DV_HIEN_TOI_DA = 8;   // mỗi kỳ thiếu chỉ kể tên tối đa chừng này đơn vị

  /** 'dd.mm.yyyy' → yyyymmdd để xếp kỳ */
  function soNgay(ten) {
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(ten);
    return m ? Number(m[3] + m[2] + m[1]) : 0;
  }

  /**
   * Kết quả kiểm đủ file / đủ tab kỳ (GAS kiemDuFile_) → hai phần để vẽ:
   * { file: {hopLe, chu, dong, cach}, ky: {…} | null } — ky null khi chưa có kỳ nào.
   * @param {function(string): string} tenDv — mã đơn vị → tên hiện
   */
  function tomTatDuFile(du, tenDv) {
    if (!du.soKy) return { file: { hopLe: true, chu: 'Chưa tạo kỳ nào nên chưa có file đơn vị.', dong: [] }, ky: null };
    var dongFile = du.thieuFile.map(function (t) { return tenDv(t.unitCode) + ': chưa có file' + (t.ly ? ' — ' + t.ly : ''); })
      .concat(du.fileHong.map(function (uc) { return tenDv(uc) + ': file đã xoá hoặc không mở được'; }))
      .concat(du.chuaGiao.map(function (uc) { return tenDv(uc) + ': có mã ở cột A file tổng nhưng chưa được giao'; }));
    var file = dongFile.length
      ? { hopLe: false, chu: 'Thiếu file: ' + du.coFile + '/' + du.soDonVi + ' đơn vị có file.', dong: dongFile,
        cach: 'Tạo lại kỳ gần nhất ở mục Kỳ báo cáo (chỉ tạo phần còn thiếu); đơn vị chưa giao thì bấm Giao theo mã trong bảng.' }
      : { hopLe: true, chu: 'Đủ file: ' + du.coFile + '/' + du.soDonVi + ' đơn vị.', dong: [] };
    // Gom theo kỳ: một kỳ tạo dở thường thiếu ở hàng chục file cùng lúc
    var theoKy = {};
    du.thieuTab.forEach(function (t) {
      t.ky.forEach(function (k) { (theoKy[k] = theoKy[k] || []).push(tenDv(t.unitCode)); });
    });
    var soDaKiem = du.coFile - du.fileHong.length - du.chuaKiem;
    var dongKy = Object.keys(theoKy).sort(function (a, b) { return soNgay(a) - soNgay(b); }).map(function (k) {
      var ten = theoKy[k];
      return 'Kỳ ' + k + ': thiếu ở ' + ten.length + '/' + soDaKiem + ' file — ' +
        ten.slice(0, DV_HIEN_TOI_DA).join(', ') + (ten.length > DV_HIEN_TOI_DA ? '… (còn ' + (ten.length - DV_HIEN_TOI_DA) + ')' : '');
    });
    if ((du.tongThieu || []).length) dongKy.unshift('File tổng: thiếu kỳ ' + du.tongThieu.join(', '));
    if (du.chuaKiem) dongKy.push('Còn ' + du.chuaKiem + ' file chưa kiểm (hết thời gian một lần chạy).');
    var ky = dongKy.length
      ? { hopLe: false, chu: 'Tab kỳ chưa đủ (' + du.soKy + ' kỳ):', dong: dongKy,
        cach: du.thieuTab.length || (du.tongThieu || []).length ? 'Tạo lại kỳ đó ở mục Kỳ báo cáo (kỳ đã khoá thì mở khoá trước).' : '' }
      : { hopLe: true, chu: 'Đủ tab ' + du.soKy + ' kỳ ở file tổng và mọi file đơn vị.', dong: [] };
    return { file: file, ky: ky };
  }

  /** Câu báo sau khi giao theo mã ở cột A (kết quả GAS qtGiaoTheoMau) */
  function tomTatGiaoTheoMau(kq) {
    var chu;
    if (!kq.docDuoc && !kq.coAll) chu = 'Cột A của file tổng chưa có mã đơn vị nào.';
    else if (kq.moi.length) chu = 'Đã giao thêm ' + kq.moi.length + ' đơn vị — bảng đang giao cho ' + kq.tong + ' đơn vị.';
    else chu = 'Các đơn vị có mã trong bảng đều đã được giao (' + kq.tong + ' đơn vị).';
    if (kq.coAll) chu += ' Dòng all là mọi đơn vị — giao ở mục Phân quyền.';
    if (kq.sai && kq.sai.length) chu += ' Mã không có trong danh mục: ' + kq.sai.join(', ') + '.';
    var loi = (kq.quyen && kq.quyen.loi) || [];
    if (loi.length) chu += ' Lỗi chia quyền: ' + loi.join(' · ');
    return { chu: chu, laLoi: !!((kq.sai && kq.sai.length) || loi.length) };
  }

  /**
   * Vài dòng đầu tab đầu của Excel (mảng dòng × ô chữ) → { coMaDonVi, tenBang }:
   * dòng tiêu đề cột = dòng đầu có ô A đúng 'Mã đơn vị'; tên bảng = dòng đầu tiên phía
   * trên đó chỉ có ĐÚNG MỘT ô có chữ (dòng nhiều ô là tiêu đề nhóm cột, không phải tên
   * bảng); '' = file không ghi tên bảng.
   */
  function tenBangTuExcel(dong) {
    var dongTieuDe = -1;
    (dong || []).some(function (o, i) {
      if (String(o[0] || '').trim() === 'Mã đơn vị') { dongTieuDe = i; return true; }
      return false;
    });
    var tenBang = '';
    for (var i = 0; i < dongTieuDe && !tenBang; i++) {
      var coChu = (dong[i] || []).map(function (x) { return String(x || '').trim(); }).filter(Boolean);
      if (coChu.length === 1) tenBang = coChu[0];
    }
    return { coMaDonVi: dongTieuDe >= 0, tenBang: tenBang.replace(/\s+/g, ' ') };
  }

  /**
   * Câu báo sau khi tạo bảng từ Excel: thành công + việc làm tiếp.
   * giaoTuDong = kết quả GAS tự giao theo mã cột A (chỉ bảng Sở giao dòng), có thể thiếu.
   */
  function baoTaoTuExcel(bang, laGopTach, giaoTuDong) {
    var chu = 'Đã tải lên thành công — đã tạo bảng "' + bang.tableName + '". ';
    if (giaoTuDong && giaoTuDong.ok) chu += tomTatGiaoTheoMau(giaoTuDong).chu + ' ';
    else if (giaoTuDong) chu += 'Chưa tự giao được cho đơn vị (' + (giaoTuDong.loi || 'lỗi') + ') — bấm "Giao theo mã trong bảng". ';
    return chu + 'Việc tiếp theo: ' +
      (laGopTach ? 'bấm "Tạo bảng cho đơn vị"'
        : 'giao bảng cho các đơn vị ở mục Phân quyền, rồi bấm "Tạo bảng cho đơn vị"') +
      ', chọn ngày kỳ đầu và bấm "Tạo cho các đơn vị".';
  }

  return {
    tenBangTuExcel: tenBangTuExcel, baoTaoTuExcel: baoTaoTuExcel,
    KIEU_COT: KIEU_COT, CACH_NHAP_DONG: CACH_NHAP_DONG, CACH_TONG_HOP: CACH_TONG_HOP, KIEU_KY: KIEU_KY, DONG_DAU: DONG_DAU,
    chuCot: chuCot, maTuTen: maTuTen, luaChonLinhVuc: luaChonLinhVuc, maLinhVucTuTen: maLinhVucTuTen,
    oPhu: oPhu, tomTatKiem: tomTatKiem, tomTatDuFile: tomTatDuFile, tenLinhVuc: tenLinhVuc, soDonViCoFile: soDonViCoFile, tomTatGiaoTheoMau: tomTatGiaoTheoMau
  };
})();
