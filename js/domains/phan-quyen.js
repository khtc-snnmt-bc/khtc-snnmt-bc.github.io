// ============================================================
// bcsnn · js/domains/phan-quyen.js
// Vai trò  : Nghiệp vụ thuần trang quản trị: tài khoản theo đơn vị, giao bảng, lọc đơn vị
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils (BO_DAU), config
// Phiên bản: 0.6.0 · Cập nhật: 10/10/2026 16:10
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

  /** Đơn vị nhóm Quản trị (Quản trị / Quản lý báo cáo) — mặc định thấy mọi bảng, không phân quyền từng bảng. */
  function laDonViToanQuyen(d) {
    return !!d && (d.role === 'Quản trị' || d.role === 'Quản lý báo cáo');
  }

  /** Mục Phân quyền của bảng: đơn vị có trong bảng (dsMa từ GAS) và đơn vị còn thêm vào bảng tổng được. */
  function chiaDonViBang(donVi, dsMa) {
    return {
      trong: donVi.filter(function (d) { return dsMa.indexOf(d.unitCode) >= 0; }),
      themDuoc: donVi.filter(function (d) { return dsMa.indexOf(d.unitCode) < 0 && !laDonViToanQuyen(d); })
    };
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
    thayGiao: thayGiao, laDonViToanQuyen: laDonViToanQuyen, chiaDonViBang: chiaDonViBang,
    tomTatLuu: tomTatLuu
  };
})();
