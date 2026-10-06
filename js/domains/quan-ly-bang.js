// ============================================================
// bcsnn · js/domains/quan-ly-bang.js
// Vai trò  : Nghiệp vụ thuần mục Quản lý bảng: kiểu cột, chữ cột, mã bảng từ tên,
//            cách nhập dòng / tổng hợp, nhãn lĩnh vực, câu báo kiểm mẫu / giao theo mã
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils (BO_DAU), config
// Phiên bản: 0.2.0 · Cập nhật: 07/10/2026 05:13
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

  return {
    KIEU_COT: KIEU_COT, CACH_NHAP_DONG: CACH_NHAP_DONG, CACH_TONG_HOP: CACH_TONG_HOP, DONG_DAU: DONG_DAU,
    chuCot: chuCot, maTuTen: maTuTen, luaChonLinhVuc: luaChonLinhVuc, maLinhVucTuTen: maLinhVucTuTen,
    oPhu: oPhu, tomTatKiem: tomTatKiem, tomTatGiaoTheoMau: tomTatGiaoTheoMau
  };
})();
