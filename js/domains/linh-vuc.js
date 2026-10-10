// ============================================================
// bcsnn · js/domains/linh-vuc.js
// Vai trò  : Nghiệp vụ thuần: lĩnh vực của trang (theo thư mục web), lọc bảng theo lĩnh vực
// Lớp      : domains — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.1.0 · Cập nhật: 10/10/2026 13:50
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

  return { layTheoThuMuc: layTheoThuMuc, locBang: locBang };
})();
