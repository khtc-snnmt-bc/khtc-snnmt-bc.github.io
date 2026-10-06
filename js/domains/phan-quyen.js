// ============================================================
// bcsnn · js/domains/phan-quyen.js
// Vai trò  : Nghiệp vụ thuần trang quản trị: tài khoản theo đơn vị, giao bảng, lọc đơn vị
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils (BO_DAU), config
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 20:54
// ============================================================
// Dữ liệu dạng GAS qtLayDuLieu trả: taiKhoan [{email, unitCode, role}],
// giao [{unitCode, tableCode, coFile}], donVi [{unitCode, unitName}].

var PHAN_QUYEN = (function () {
  'use strict';

  var VAI_TRO = ['Nhập liệu', 'Quản lý báo cáo', 'Quản trị'];

  function xepDonVi(donVi) {
    return (donVi || []).slice().sort(function (a, b) {
      return String(a.unitName).localeCompare(String(b.unitName), 'vi', { numeric: true });
    });
  }

  function locDonVi(donVi, tuKhoa) {
    if (!tuKhoa) return donVi;
    return donVi.filter(function (d) { return BO_DAU.khop(d.unitName + ' ' + d.unitCode, tuKhoa); });
  }

  function taiKhoanCuaDonVi(taiKhoan, unitCode) {
    return taiKhoan.filter(function (t) { return t.unitCode === unitCode; })
      .map(function (t) { return { email: t.email, role: t.role }; });
  }

  /** Danh sách tài khoản sau khi lưu đơn vị unitCode (khớp cách GAS ghi). */
  function thayTaiKhoan(taiKhoan, unitCode, dsMoi) {
    return taiKhoan.filter(function (t) { return t.unitCode !== unitCode; }).concat(dsMoi.map(function (d) {
      return { email: String(d.email).toLowerCase().trim(), unitCode: unitCode, role: d.role };
    }).filter(function (t) { return t.email; }));
  }

  /** { unitCode: coFile } của một bảng */
  function giaoCuaBang(giao, tableCode) {
    var kq = {};
    giao.forEach(function (g) { if (g.tableCode === tableCode) kq[g.unitCode] = g.coFile; });
    return kq;
  }

  /** Danh sách giao sau khi lưu bảng tableCode: đơn vị đã có file thì luôn giữ. */
  function thayGiao(giao, tableCode, dsDonVi) {
    var cu = giaoCuaBang(giao, tableCode);
    var giu = giao.filter(function (g) { return g.tableCode !== tableCode || (g.coFile && dsDonVi.indexOf(g.unitCode) < 0); });
    return giu.concat(dsDonVi.map(function (uc) { return { unitCode: uc, tableCode: tableCode, coFile: !!cu[uc] }; }));
  }

  /** Câu báo sau khi lưu: số file đã cập nhật quyền + lỗi (nếu có). */
  function tomTatLuu(res, tenDonVi) {
    var q = res.quyen || { soFile: 0, loi: [] };
    var cau = 'Đã lưu.';
    if (q.them || q.doi || q.go) cau += ' Đã cập nhật quyền ' + q.soFile + ' file.';
    if (res.giuLai && res.giuLai.length) {
      cau += ' Giữ giao (đã có file): ' + res.giuLai.map(tenDonVi).join(', ') + '.';
    }
    if (q.loi && q.loi.length) cau += ' Lỗi chia quyền ' + q.loi.length + ' file: ' + q.loi[0];
    return cau;
  }

  return {
    VAI_TRO: VAI_TRO, xepDonVi: xepDonVi, locDonVi: locDonVi, taiKhoanCuaDonVi: taiKhoanCuaDonVi,
    thayTaiKhoan: thayTaiKhoan, giaoCuaBang: giaoCuaBang, thayGiao: thayGiao, tomTatLuu: tomTatLuu
  };
})();
