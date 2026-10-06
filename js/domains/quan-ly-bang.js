// ============================================================
// bcsnn · js/domains/quan-ly-bang.js
// Vai trò  : Nghiệp vụ thuần mục Quản lý bảng: kiểu cột, chữ cột, mã bảng từ tên,
//            nhóm lĩnh vực đã có, câu báo kết quả kiểm mẫu
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils (BO_DAU), config
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 22:47
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

  /** Các nhóm lĩnh vực đã có, abc */
  function dsNhom(bang) {
    var kq = [];
    (bang || []).forEach(function (b) { if (b.group && kq.indexOf(b.group) < 0) kq.push(b.group); });
    return kq.sort(function (a, b) { return a.localeCompare(b, 'vi'); });
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

  return {
    KIEU_COT: KIEU_COT, CACH_NHAP_DONG: CACH_NHAP_DONG, DONG_DAU: DONG_DAU,
    chuCot: chuCot, maTuTen: maTuTen, dsNhom: dsNhom, oPhu: oPhu, tomTatKiem: tomTatKiem
  };
})();
