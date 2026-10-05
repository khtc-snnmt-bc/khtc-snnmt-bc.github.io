// ============================================================
// bcsnn · js/pages/dang-nhap.js
// Vai trò  : Màn hình đăng nhập bồi thường (pptx trang 2): chọn đơn vị ↔ nhập Gmail hai chiều
// Lớp      : pages — được gọi bởi: app (index.html) · được phép gọi: domains, services, utils, config
// Phiên bản: 0.3.0 · Cập nhật: 05/10/2026 22:32
// ============================================================

var PAGE_DANG_NHAP = (function () {
  'use strict';

  var MAU_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var TRE_GO_EMAIL = 450; // ms chờ người dùng gõ xong Gmail rồi mới hỏi GAS

  var dsDonViGoc = [];
  var donViDangChon = null;   // { unitCode, unitName } hoặc null
  var taiKhoanTheoDonVi = {}; // bộ nhớ đệm: unitCode → [email]
  var luotHoiEmail = 0;       // bỏ qua kết quả trả về muộn của lần hỏi cũ
  var hen = null;
  var elTrang, elInputDonVi, elDsDonVi, elInputLoc, elListChonNhanh, elInputEmail, elDsTaiKhoan;
  var elBtnDangNhap, elThongBao, elBtnQuayLai;
  var onDangNhapThanhCong, onQuayLaiCallback;

  function khoiTao(callbackThanhCong, callbackQuayLai) {
    onDangNhapThanhCong = callbackThanhCong;
    onQuayLaiCallback = callbackQuayLai;

    elTrang = DOM.$('#trang-dang-nhap');
    elInputDonVi = DOM.$('#input-don-vi');
    elDsDonVi = DOM.$('#ds-don-vi');
    elInputLoc = DOM.$('#loc-don-vi');
    elListChonNhanh = DOM.$('#danh-sach-chon-nhanh');
    elInputEmail = DOM.$('#input-email');
    elDsTaiKhoan = DOM.$('#ds-tai-khoan');
    elBtnDangNhap = DOM.$('#btn-dang-nhap');
    elThongBao = DOM.$('#thong-bao-dang-nhap');
    elBtnQuayLai = DOM.$('#btn-quay-lai-dieu-huong');

    ganSuKien();
    taiDanhSachDonVi();
  }

  function ganSuKien() {
    elBtnQuayLai.addEventListener('click', function (e) {
      e.preventDefault();
      an();
      if (typeof onQuayLaiCallback === 'function') onQuayLaiCallback();
    });

    // Cột phải: lọc danh sách chọn nhanh
    elInputLoc.addEventListener('input', function () {
      veDanhSachChonNhanh(elInputLoc.value);
    });

    // Ô đơn vị bên trái: gõ khớp đúng tên/mã thì chọn luôn
    elInputDonVi.addEventListener('input', function () {
      var dv = DON_VI.timChinhXac(dsDonViGoc, elInputDonVi.value);
      if (dv) {
        chonDonVi(dv, false);
      } else if (donViDangChon) {
        donViDangChon = null;
        xoaDanhSachTaiKhoan();
        danhDauChonNhanh('');
      }
    });

    // Ô Gmail: gõ đủ địa chỉ thì tự tìm và điền đơn vị
    elInputEmail.addEventListener('input', function () {
      baoLoi('');
      clearTimeout(hen);
      hen = setTimeout(timDonViTheoEmailDaGo, TRE_GO_EMAIL);
    });
    elInputEmail.addEventListener('change', function () {
      clearTimeout(hen);
      timDonViTheoEmailDaGo();
    });

    elBtnDangNhap.addEventListener('click', function (e) {
      e.preventDefault();
      xuLyDangNhap();
    });
  }

  function baoLoi(thongDiep) {
    if (!thongDiep) {
      DOM.an(elThongBao);
      elThongBao.textContent = '';
      return;
    }
    elThongBao.textContent = thongDiep;
    elThongBao.className = 'alert alert-error';
    DOM.hien(elThongBao);
  }

  function datTrangThaiNut(dangTai) {
    elBtnDangNhap.disabled = dangTai;
    if (dangTai) {
      elBtnDangNhap.innerHTML = '<span class="spinner"></span> Đang xác thực...';
    } else {
      elBtnDangNhap.textContent = 'Đăng nhập';
    }
  }

  // ---------- Danh sách đơn vị ----------

  function taiDanhSachDonVi() {
    API.layDanhSachDonVi()
      .then(function (res) {
        if (res.ok && res.donVi && res.donVi.length) {
          dsDonViGoc = DON_VI.sapXepDonVi(res.donVi);
          napDatalistDonVi();
          veDanhSachChonNhanh(elInputLoc.value);
        } else {
          baoLoi(res.loi || 'Chưa tải được danh sách đơn vị.');
        }
      })
      .catch(function () {
        baoLoi('Chưa kết nối được máy chủ. Vui lòng tải lại trang sau ít phút.');
      });
  }

  function napDatalistDonVi() {
    elDsDonVi.innerHTML = '';
    dsDonViGoc.forEach(function (dv) {
      elDsDonVi.appendChild(DOM.tao('option', { value: dv.unitName }));
    });
  }

  function veDanhSachChonNhanh(tuKhoa) {
    elListChonNhanh.innerHTML = '';
    var ds = DON_VI.locDonVi(dsDonViGoc, tuKhoa);
    if (!ds.length) {
      elListChonNhanh.appendChild(DOM.tao('li', { class: 'quick-unit-item muted' }, 'Không tìm thấy đơn vị phù hợp'));
      return;
    }
    var maDangChon = donViDangChon ? donViDangChon.unitCode : '';
    DON_VI.nhomTheoVaiTro(ds).forEach(function (nhom) {
      elListChonNhanh.appendChild(DOM.tao('li', { class: 'quick-group-label' }, nhom.ten));
      nhom.ds.forEach(function (dv) {
        var li = DOM.tao('li', {
          class: 'quick-unit-item' + (dv.unitCode === maDangChon ? ' selected' : ''),
          'data-code': dv.unitCode
        }, dv.unitName);
        li.addEventListener('click', function () { chonDonVi(dv, true); });
        elListChonNhanh.appendChild(li);
      });
    });
  }

  function danhDauChonNhanh(unitCode) {
    DOM.$$('.quick-unit-item', elListChonNhanh).forEach(function (li) {
      DOM.batTat(li, 'selected', li.getAttribute('data-code') === unitCode);
    });
  }

  // ---------- Hai chiều ----------

  /**
   * Chọn đơn vị (từ cột phải, ô gõ hoặc kết quả tìm theo Gmail) → điền ô đơn vị,
   * nạp danh sách tài khoản của đơn vị đó vào ô Người nhập.
   * @param {boolean} ghiLaiO — true: ghi tên vào ô đơn vị (người dùng chưa gõ chữ đó)
   */
  function chonDonVi(dv, ghiLaiO) {
    var doiDonVi = !donViDangChon || donViDangChon.unitCode !== dv.unitCode;
    donViDangChon = { unitCode: dv.unitCode, unitName: dv.unitName };
    if (ghiLaiO) elInputDonVi.value = dv.unitName;
    danhDauChonNhanh(dv.unitCode);
    baoLoi('');
    if (doiDonVi) taiTaiKhoanCuaDonVi(dv.unitCode);
  }

  function xoaDanhSachTaiKhoan() {
    elDsTaiKhoan.innerHTML = '';
  }

  function taiTaiKhoanCuaDonVi(unitCode) {
    xoaDanhSachTaiKhoan();
    var coSan = taiKhoanTheoDonVi[unitCode];
    if (coSan) { napDatalistTaiKhoan(coSan); return; }
    API.layTaiKhoan(unitCode)
      .then(function (res) {
        if (!res.ok) return;
        taiKhoanTheoDonVi[unitCode] = res.emails || [];
        // Người dùng đã đổi sang đơn vị khác trong lúc chờ → bỏ kết quả
        if (donViDangChon && donViDangChon.unitCode === unitCode) napDatalistTaiKhoan(taiKhoanTheoDonVi[unitCode]);
      })
      .catch(function () { /* im lặng: vẫn gõ tay Gmail được */ });
  }

  function napDatalistTaiKhoan(dsEmail) {
    xoaDanhSachTaiKhoan();
    dsEmail.forEach(function (email) {
      elDsTaiKhoan.appendChild(DOM.tao('option', { value: email }));
    });
  }

  function timDonViTheoEmailDaGo() {
    var email = elInputEmail.value.trim().toLowerCase();
    if (!MAU_EMAIL.test(email)) return;
    var luot = ++luotHoiEmail;
    API.timDonViTheoEmail(email)
      .then(function (res) {
        if (luot !== luotHoiEmail || !res.ok || !res.donVi || !res.donVi.length) return;
        // Đã chọn đúng một đơn vị của Gmail này rồi thì giữ nguyên
        var daDung = donViDangChon && res.donVi.some(function (d) { return d.unitCode === donViDangChon.unitCode; });
        if (daDung) return;
        chonDonVi(res.donVi[0], true);
      })
      .catch(function () { /* im lặng: bấm Đăng nhập sẽ báo lỗi cụ thể */ });
  }

  // ---------- Đăng nhập ----------

  function xuLyDangNhap() {
    var email = elInputEmail.value.trim().toLowerCase();

    if (!donViDangChon) {
      baoLoi('Vui lòng chọn đơn vị báo cáo (gõ tên hoặc chọn ở danh sách bên phải).');
      elInputDonVi.focus();
      return;
    }
    if (!email) {
      baoLoi('Vui lòng nhập Gmail được cấp quyền nhập liệu.');
      elInputEmail.focus();
      return;
    }

    baoLoi('');
    datTrangThaiNut(true);

    API.dangNhap(email, donViDangChon.unitCode)
      .then(function (res) {
        datTrangThaiNut(false);
        if (!res.ok) {
          baoLoi(res.loi || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
          return;
        }
        var thongTinPhien = {
          email: email,
          unitCode: donViDangChon.unitCode,
          unitName: res.unitName || donViDangChon.unitName,
          role: res.role || 'Nhập liệu',
          tables: res.tables || []
        };
        PHIEN.luu(thongTinPhien);
        an();
        if (typeof onDangNhapThanhCong === 'function') onDangNhapThanhCong(thongTinPhien);
      })
      .catch(function () {
        datTrangThaiNut(false);
        baoLoi('Không kết nối được máy chủ. Vui lòng thử lại sau ít phút.');
      });
  }

  function hien() {
    DOM.hien(elTrang);
    if (!dsDonViGoc.length) taiDanhSachDonVi();
  }

  function an() {
    DOM.an(elTrang);
  }

  return { khoiTao: khoiTao, hien: hien, an: an };
})();
