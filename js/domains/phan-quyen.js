// ============================================================
// bcsnn · js/domains/phan-quyen.js
// Vai trò  : Nghiệp vụ thuần trang quản trị: tài khoản theo đơn vị, giao bảng, lọc đơn vị
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils (BO_DAU), config
// Phiên bản: 0.4.0 · Cập nhật: 08/10/2026 09:16
// ============================================================
// Dữ liệu dạng GAS qtLayDuLieu trả: taiKhoan [{email, unitCode, role}],
// giao [{unitCode, tableCode, coFile, access: sua|xem|khong}], donVi [{unitCode, unitName}].

var PHAN_QUYEN = (function () {
  'use strict';

  var VAI_TRO = ['Nhập liệu', 'Quản lý báo cáo', 'Quản trị'];

  var VAI_TRO_DON_VI = ['Đơn vị báo cáo', 'Quản lý báo cáo', 'Quản trị'];

  /** 'Ban QLDA Bình Thới' → 'BanQldaBinhThoi' — gợi ý mã đơn vị (không dấu, không cách) */
  function maDonViTuTen(ten) {
    return BO_DAU.boDau(ten || '').split(/[^a-z0-9]+/).filter(Boolean)
      .map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1); }).join('').slice(0, 40);
  }

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

  /** { unitCode: {coFile, access} } của một bảng — gồm cả đơn vị đã bỏ quyền nhưng còn file. */
  function quyenCuaBang(giao, tableCode) {
    var kq = {};
    giao.forEach(function (g) {
      if (g.tableCode === tableCode) kq[g.unitCode] = { coFile: !!g.coFile, access: g.access || 'sua' };
    });
    return kq;
  }

  /** { unitCode: coFile } của các đơn vị đang được giao (nhập hoặc xem) một bảng */
  function giaoCuaBang(giao, tableCode) {
    var kq = {};
    giao.forEach(function (g) {
      if (g.tableCode === tableCode && g.access !== 'khong') kq[g.unitCode] = g.coFile;
    });
    return kq;
  }

  /** Hai ô Nhập / Xem → quyền: nhập kéo theo xem. */
  function quyenTuO(nhap, xem) {
    return nhap ? 'sua' : (xem ? 'xem' : 'khong');
  }

  /** Danh sách giao sau khi lưu bảng tableCode (khớp capNhatGiao_ phía GAS). */
  function thayGiao(giao, tableCode, quyen) {
    var cu = quyenCuaBang(giao, tableCode);
    var kq = giao.filter(function (g) { return g.tableCode !== tableCode; });
    Object.keys(cu).forEach(function (uc) {
      var q = quyen[uc] || 'khong';
      if (q !== 'khong' || cu[uc].coFile) kq.push({ unitCode: uc, tableCode: tableCode, coFile: cu[uc].coFile, access: q });
    });
    Object.keys(quyen).forEach(function (uc) {
      if (!(uc in cu) && quyen[uc] !== 'khong') kq.push({ unitCode: uc, tableCode: tableCode, coFile: false, access: quyen[uc] });
    });
    return kq;
  }

  /**
   * Đơn vị quản lý hiện sẵn khi mở một bảng (quản trị vẫn đổi được):
   * đã lưu → giữ; chưa → lấy theo bảng khác cùng lĩnh vực; chưa có nữa →
   * đơn vị có mã mở đầu bằng tên lĩnh vực (VD lĩnh vực BTTDC → BTTDC.SNNMT).
   * @returns {Array<string>} mã đơn vị
   */
  function quanLyMacDinh(bang, dsBang, donVi) {
    if (bang.managerUnits && bang.managerUnits.length) return bang.managerUnits.slice();
    var cungNhom = dsBang.filter(function (b) {
      return b !== bang && b.group && b.group === bang.group && b.managerUnits && b.managerUnits.length;
    })[0];
    if (cungNhom) return cungNhom.managerUnits.slice();
    var nhom = String(bang.group || '').toUpperCase();
    var dv = nhom && donVi.filter(function (d) { return String(d.unitCode).toUpperCase().indexOf(nhom + '.') === 0; })[0];
    return dv ? [dv.unitCode] : [];
  }

  /** Câu báo sau khi lưu: số file đã cập nhật quyền + lỗi (nếu có). */
  function tomTatLuu(res, tenDonVi) {
    var q = res.quyen || { soFile: 0, loi: [] };
    var cau = 'Đã lưu.';
    if (q.them || q.doi || q.go) cau += ' Đã cập nhật quyền ' + q.soFile + ' file.';
    if (q.loi && q.loi.length) cau += ' Lỗi chia quyền ' + q.loi.length + ' file: ' + q.loi[0];
    return cau;
  }

  return {
    VAI_TRO: VAI_TRO, VAI_TRO_DON_VI: VAI_TRO_DON_VI, maDonViTuTen: maDonViTuTen, xepDonVi: xepDonVi, locDonVi: locDonVi, taiKhoanCuaDonVi: taiKhoanCuaDonVi,
    thayTaiKhoan: thayTaiKhoan, giaoCuaBang: giaoCuaBang, quyenCuaBang: quyenCuaBang, quyenTuO: quyenTuO,
    thayGiao: thayGiao, quanLyMacDinh: quanLyMacDinh,
    tomTatLuu: tomTatLuu
  };
})();
