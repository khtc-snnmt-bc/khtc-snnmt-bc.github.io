// ============================================================
// bcsnn · js/domains/linh-vuc.js
// Vai trò  : Nghiệp vụ thuần: lĩnh vực của trang theo thư mục web
// Lớp      : domains — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.3.0 · Cập nhật: 10/10/2026 16:10
// ============================================================
// Mỗi lĩnh vực một địa chỉ (/BTTDC, /Nhiem_Vu, /BC_xa) và một Sheet quản lý riêng (b10b) —
// GAS chỉ trả đơn vị, bảng của lĩnh vực trang gửi kèm, trang không phải lọc gì.

var LINH_VUC = (function () {
  'use strict';

  /** Thư mục web → {thuMuc, ma, ten, tenNgan} hoặc null */
  function layTheoThuMuc(thuMuc, dsLinhVuc) {
    var lv = (dsLinhVuc || CAU_HINH.LINH_VUC)[thuMuc];
    return lv ? { thuMuc: thuMuc, ma: lv.ma, ten: lv.ten, tenNgan: lv.tenNgan } : null;
  }

  return { layTheoThuMuc: layTheoThuMuc };
})();
