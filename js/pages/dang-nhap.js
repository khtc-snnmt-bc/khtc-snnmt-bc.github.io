// ============================================================
// bcsnn · js/pages/dang-nhap.js
// Vai trò  : Màn hình đăng nhập bồi thường (pptx trang 2): chọn đơn vị, nhập Gmail
// Lớp      : pages — được gọi bởi: app (index.html) · được phép gọi: domains, services, utils, config
// Phiên bản: 0.2.0 · Cập nhật: 05/10/2026 14:55
// ============================================================

var PAGE_DANG_NHAP = (function () {
  'use strict';

  var dsDonViGoc = [];
  var tabHienTai = 'don-vi'; // 'don-vi' hoặc 'quan-tri'
  var elTrang, elSelectDonVi, elInputDonViHienThi, elInputLoc, elListChonNhanh, elInputEmail, elInputMatKhau, elNhomMatKhau;
  var elBtnDangNhap, elThongBao, elBtnQuayLai, elTabDonVi, elTabQuanTri;
  var onDangNhapThanhCong, onQuayLaiCallback;

  function khoiTao(callbackThanhCong, callbackQuayLai) {
    onDangNhapThanhCong = callbackThanhCong;
    onQuayLaiCallback = callbackQuayLai;

    elTrang = DOM.$('#trang-dang-nhap');
    elSelectDonVi = DOM.$('#select-don-vi');
    elInputDonViHienThi = DOM.$('#input-don-vi-hien-thi');
    elInputLoc = DOM.$('#loc-don-vi');
    elListChonNhanh = DOM.$('#danh-sach-chon-nhanh');
    elInputEmail = DOM.$('#input-email');
    elInputMatKhau = DOM.$('#input-mat-khau');
    elNhomMatKhau = DOM.$('#nhom-mat-khau');
    elBtnDangNhap = DOM.$('#btn-dang-nhap');
    elThongBao = DOM.$('#thong-bao-dang-nhap');
    elBtnQuayLai = DOM.$('#btn-quay-lai-dieu-huong');
    elTabDonVi = DOM.$('#tab-loai-don-vi');
    elTabQuanTri = DOM.$('#tab-loai-quan-tri');

    ganSuKien();
    taiDanhSachDonVi();
  }

  function ganSuKien() {
    // Nút quay lại trang điều hướng
    if (elBtnQuayLai) {
      elBtnQuayLai.addEventListener('click', function (e) {
        e.preventDefault();
        an();
        if (typeof onQuayLaiCallback === 'function') {
          onQuayLaiCallback();
        }
      });
    }

    // Chuyển tab Đơn vị báo cáo / Quản trị
    if (elTabDonVi) {
      elTabDonVi.addEventListener('click', function () {
        chuyenTab('don-vi');
      });
    }
    if (elTabQuanTri) {
      elTabQuanTri.addEventListener('click', function () {
        chuyenTab('quan-tri');
      });
    }

    // Lọc danh sách chọn nhanh theo từ khoá
    if (elInputLoc) {
      elInputLoc.addEventListener('input', function () {
        veDanhSachChonNhanh(elInputLoc.value);
      });
    }

    // Chọn từ dropdown
    if (elSelectDonVi) {
      elSelectDonVi.addEventListener('change', function () {
        var ma = elSelectDonVi.value;
        var ten = elSelectDonVi.options[elSelectDonVi.selectedIndex].text;
        if (elInputDonViHienThi) elInputDonViHienThi.value = ma ? ten : '';
        capNhatChonNhanh(ma);
      });
    }

    // Bấm nút Đăng nhập
    if (elBtnDangNhap) {
      elBtnDangNhap.addEventListener('click', function (e) {
        e.preventDefault();
        xuLyDangNhap();
      });
    }
  }

  function chuyenTab(loai) {
    tabHienTai = loai;
    if (elTabDonVi) DOM.batTat(elTabDonVi, 'active', loai === 'don-vi');
    if (elTabQuanTri) DOM.batTat(elTabQuanTri, 'active', loai === 'quan-tri');

    if (elNhomMatKhau) {
      if (loai === 'quan-tri') {
        DOM.hien(elNhomMatKhau);
      } else {
        DOM.an(elNhomMatKhau);
      }
    }

    // Nếu chọn Quản trị, tự gán đơn vị là KHTC.SNNMT
    if (loai === 'quan-tri') {
      chonDonVi('KHTC.SNNMT', 'Phòng Kế hoạch – Tài chính');
    }
    baoLoi('', '');
  }

  function baoLoi(thongDiep, kieu) {
    if (!elThongBao) return;
    if (!thongDiep) {
      DOM.an(elThongBao);
      elThongBao.textContent = '';
      elThongBao.className = 'alert';
      return;
    }
    elThongBao.textContent = thongDiep;
    elThongBao.className = 'alert ' + (kieu === 'info' ? 'alert-info' : 'alert-error');
    DOM.hien(elThongBao);
  }

  function datTrangThaiNut(dangTai) {
    if (!elBtnDangNhap) return;
    elBtnDangNhap.disabled = dangTai;
    if (dangTai) {
      elBtnDangNhap.innerHTML = '<span class="spinner"></span> Đang xác thực...';
    } else {
      elBtnDangNhap.textContent = 'Đăng nhập';
    }
  }

  function taiDanhSachDonVi() {
    var gasUrl = CAU_HINH.layGasUrl();
    if (!gasUrl) return;

    API.layDanhSachDonVi()
      .then(function (res) {
        if (res.ok && res.donVi && res.donVi.length) {
          dsDonViGoc = DON_VI.sapXepDonVi(res.donVi);
          napDonViVaoGiaoDien(dsDonViGoc);
        }
      })
      .catch(function (err) {
        console.warn('Lỗi tải đơn vị từ GAS:', err);
      });
  }

  function napDonViVaoGiaoDien(ds) {
    if (elSelectDonVi) {
      elSelectDonVi.innerHTML = '<option value="">-- Nhập hoặc chọn nhanh danh sách bên phải --</option>';
      ds.forEach(function (dv) {
        var opt = DOM.tao('option', { value: dv.unitCode }, dv.unitName);
        elSelectDonVi.appendChild(opt);
      });
    }
    veDanhSachChonNhanh('');
  }

  function veDanhSachChonNhanh(tuKhoa) {
    if (!elListChonNhanh) return;
    elListChonNhanh.innerHTML = '';

    var ds = DON_VI.locDonVi(dsDonViGoc, tuKhoa);
    if (!ds.length) {
      var itemRong = DOM.tao('li', { class: 'quick-unit-item' }, 'Không tìm thấy đơn vị phù hợp');
      itemRong.style.color = '#999';
      elListChonNhanh.appendChild(itemRong);
      return;
    }

    var maDangChon = elSelectDonVi ? elSelectDonVi.value : '';
    ds.forEach(function (dv) {
      var li = DOM.tao('li', {
        class: 'quick-unit-item' + (dv.unitCode === maDangChon ? ' selected' : ''),
        'data-code': dv.unitCode
      }, dv.unitName);

      li.addEventListener('click', function () {
        chonDonVi(dv.unitCode, dv.unitName);
      });

      elListChonNhanh.appendChild(li);
    });
  }

  function chonDonVi(unitCode, unitName) {
    if (elSelectDonVi) elSelectDonVi.value = unitCode;
    if (elInputDonViHienThi) elInputDonViHienThi.value = unitName || unitCode;
    capNhatChonNhanh(unitCode);
  }

  function capNhatChonNhanh(unitCode) {
    if (!elListChonNhanh) return;
    var cacLi = DOM.$$('.quick-unit-item', elListChonNhanh);
    cacLi.forEach(function (li) {
      var match = li.getAttribute('data-code') === unitCode;
      DOM.batTat(li, 'selected', match);
    });
  }

  function xuLyDangNhap() {
    var unitCode = elSelectDonVi ? elSelectDonVi.value.trim() : '';
    var email = elInputEmail ? elInputEmail.value.trim().toLowerCase() : '';
    var matKhau = elInputMatKhau ? elInputMatKhau.value : '';

    if (!unitCode) {
      baoLoi('Vui lòng chọn đơn vị báo cáo từ danh sách bên phải.');
      if (elInputLoc) elInputLoc.focus();
      return;
    }
    if (!email) {
      baoLoi('Vui lòng nhập địa chỉ Gmail được cấp quyền.');
      if (elInputEmail) elInputEmail.focus();
      return;
    }
    if (tabHienTai === 'quan-tri' && !matKhau) {
      baoLoi('Vui lòng nhập mật khẩu quản trị.');
      if (elInputMatKhau) elInputMatKhau.focus();
      return;
    }

    baoLoi('', '');
    datTrangThaiNut(true);

    API.dangNhap(email, unitCode, matKhau)
      .then(function (res) {
        datTrangThaiNut(false);
        if (!res.ok) {
          baoLoi(res.loi || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
          return;
        }

        var tenDonVi = res.unitName || (elSelectDonVi.options[elSelectDonVi.selectedIndex] || {}).text || unitCode;
        var thongTinPhien = {
          email: email,
          unitCode: unitCode,
          unitName: tenDonVi,
          role: res.role || (tabHienTai === 'quan-tri' ? 'Quản trị' : 'Nhập liệu'),
          tables: res.tables || []
        };
        PHIEN.luu(thongTinPhien);

        an();
        if (typeof onDangNhapThanhCong === 'function') {
          onDangNhapThanhCong(thongTinPhien);
        }
      })
      .catch(function (err) {
        datTrangThaiNut(false);
        baoLoi('Không thể kết nối đến máy chủ: ' + err.message);
      });
  }

  function hien() {
    DOM.hien(elTrang);
    if (!dsDonViGoc.length) taiDanhSachDonVi();
  }

  function an() {
    DOM.an(elTrang);
  }

  return {
    khoiTao: khoiTao,
    hien: hien,
    an: an
  };
})();
