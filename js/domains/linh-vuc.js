// ============================================================
// bcsnn · js/domains/linh-vuc.js
// Vai trò  : Nghiệp vụ thuần: lĩnh vực của trang (theo thư mục web), lọc bảng + đơn vị theo lĩnh vực
// Lớp      : domains — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.2.0 · Cập nhật: 10/10/2026 14:10
// ============================================================
// Mỗi lĩnh vực một địa chỉ (/BTTDC, /Nhiem_Vu, /BC_xa) — chung đăng nhập, chung Apps Script;
// GAS trả mọi bảng được giao, trang chỉ hiện bảng có `group` đúng mã lĩnh vực của mình.

var LINH_VUC = (function () {
  'use strict';

  /** Thư mục web → {thuMuc, group, ten, tenNgan} hoặc null */
  function layTheoThuMuc(thuMuc, dsLinhVuc) {
    var lv = (dsLinhVuc || CAU_HINH.LINH_VUC)[thuMuc];
    return lv ? { thuMuc: thuMuc, group: lv.group, ten: lv.ten, tenNgan: lv.tenNgan } : null;
  }

  /** Hàm thuần: bảng thuộc lĩnh vực `group` */
  function locBang(dsBang, group) {
    return (dsBang || []).filter(function (b) { return b && b.group === group; });
  }

  var VAI_TRO_QUAN_TRI = 'Quản trị';

  /**
   * Hàm thuần: đơn vị hiện ở trang lĩnh vực `group` — vai trò Quản trị (quản trị cả app) luôn hiện;
   * đơn vị khác chỉ hiện khi GAS ghi lĩnh vực này trong `groups` (được giao / quản lý bảng của lĩnh vực).
   * Vai trò xếp nhóm ở ô chọn nhanh tính theo lĩnh vực: quản lý bảng của lĩnh vực (`managedGroups`)
   * → 'Quản lý báo cáo', còn lại → 'Đơn vị báo cáo' (VD Phòng BTTĐC ở trang Nhiệm vụ là đơn vị báo cáo).
   */
  function locDonVi(dsDonVi, group) {
    return (dsDonVi || []).filter(function (d) {
      return d && (d.role === VAI_TRO_QUAN_TRI || (d.groups || []).indexOf(group) >= 0);
    }).map(function (d) {
      if (d.role === VAI_TRO_QUAN_TRI) return d;
      var laQuanLy = (d.managedGroups || []).indexOf(group) >= 0;
      return Object.assign({}, d, { role: laQuanLy ? 'Quản lý báo cáo' : 'Đơn vị báo cáo' });
    });
  }

  return { layTheoThuMuc: layTheoThuMuc, locBang: locBang, locDonVi: locDonVi };
})();
