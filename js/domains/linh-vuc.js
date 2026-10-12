// ============================================================
// bcsnn · js/domains/linh-vuc.js
// Vai trò  : Nghiệp vụ thuần: lĩnh vực của trang theo thư mục web
// Lớp      : domains — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.4.0 · Cập nhật: 12/10/2026 23:58
// ============================================================
// Mỗi lĩnh vực một địa chỉ (/BTTDC, /Nhiem_Vu, /BC_xa, /BanDo/QuanLy) và một Sheet quản lý riêng (b10b) —
// GAS chỉ trả đơn vị, bảng của lĩnh vực trang gửi kèm, trang không phải lọc gì.

var LINH_VUC = (function () {
  'use strict';

  /** Thư mục web → {thuMuc, ma, ten, tenNgan, chiQuanTri} hoặc null */
  function layTheoThuMuc(thuMuc, dsLinhVuc) {
    var lv = (dsLinhVuc || CAU_HINH.LINH_VUC)[thuMuc];
    return lv ? { thuMuc: thuMuc, ma: lv.ma, ten: lv.ten, tenNgan: lv.tenNgan, chiQuanTri: !!lv.chiQuanTri } : null;
  }

  /** Đường về gốc app từ trang trong thư mục lĩnh vực: 'BTTDC' → '../', 'BanDo/QuanLy' → '../../' */
  function duongVeGoc(thuMuc) {
    return new Array(String(thuMuc).split('/').length + 1).join('../');
  }

  return { layTheoThuMuc: layTheoThuMuc, duongVeGoc: duongVeGoc };
})();
