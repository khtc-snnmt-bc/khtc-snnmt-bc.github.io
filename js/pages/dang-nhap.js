// ============================================================
// bcsnn · js/pages/dang-nhap.js
// Vai trò  : Màn hình đăng nhập (pptx trang 2): chọn đơn vị, nhập Gmail
// Lớp      : pages — được gọi bởi: app (index.html) · được phép gọi: domains, services, utils, config
// Phiên bản: 0.1.0 · Cập nhật: 05/10/2026 12:45
// ============================================================

var PAGE_DANG_NHAP = (function () {
  'use strict';

  var dsDonViGoc = [];
  var elTrang, elSelectDonVi, elInputLoc, elListChonNhanh, elInputEmail, elBtnDangNhap;
  var elThongBao, elNutCauHinhGas, onDangNhapThanhCong;

  function khoiTao(callbackThanhCong) {
    onDangNhapThanhCong = callbackThanhCong;
    elTrang = DOM.$('#trang-dang-nhap');
    elSelectDonVi = DOM.$('#select-don-vi');
    elInputLoc = DOM.$('#loc-don-vi');
    elListChonNhanh = DOM.$('#danh-sach-chon-nhanh');
    elInputEmail = DOM.$('#input-email');
    elBtnDangNhap = DOM.$('#btn-dang-nhap');
    elThongBao = DOM.$('#thong-bao-dang-nhap');
    elNutCauHinhGas = DOM.$('#link-cau-hinh-gas');

    ganSuKien();
    taiDanhSachDonVi();
  }

  function ganSuKien() {
    // Lọc danh sách chọn nhanh theo từ khoá
    if (elInputLoc) {
      elInputLoc.addEventListener('input', function () {
        veDanhSachChonNhanh(elInputLoc.value);
      });
    }

    // Chọn từ dropdown → cập nhật highlight bên danh sách nhanh
    if (elSelectDonVi) {
      elSelectDonVi.addEventListener('change', function () {
        var ma = elSelectDonVi.value;
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

    // Cài đặt GAS URL thủ công (tiện thử nghiệm)
    if (elNutCauHinhGas) {
      elNutCauHinhGas.addEventListener('click', function (e) {
        e.preventDefault();
        var hienTai = CAU_HINH.layGasUrl();
        var moi = prompt('Nhập URL Web App Apps Script (Deploy > Web app):', hienTai);
        if (moi !== null) {
          CAU_HINH.luuGasUrl(moi);
          baoLoi('', '');
          taiDanhSachDonVi();
        }
      });
    }
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
    if (!gasUrl) {
      baoLoi('Chưa cấu hình URL GAS. Bấm "Cài đặt URL kết nối" bên dưới để thiết lập.', 'info');
      // Đặt trước 1 đơn vị mẫu thử nghiệm (Ban Bình Thới) để giao diện không trống
      dsDonViGoc = [
        { unitCode: 'BQLDA.BinhThoi', unitName: 'Ban QLDA ĐTXD phường Bình Thới' },
        { unitCode: 'KHTC.SNNMT', unitName: 'Phòng Kế hoạch – Tài chính' }
      ];
      napDonViVaoGiaoDien(dsDonViGoc);
      return;
    }

    baoLoi('Đang tải danh mục đơn vị...', 'info');
    API.layDanhSachDonVi()
      .then(function (res) {
        if (res.ok && res.donVi && res.donVi.length) {
          dsDonViGoc = DON_VI.sapXepDonVi(res.donVi);
          napDonViVaoGiaoDien(dsDonViGoc);
          baoLoi('', '');
        } else {
          // Fallback đơn vị thử b04 nếu GAS chưa có endpoint layDonVi
          dsDonViGoc = [
            { unitCode: 'BQLDA.BinhThoi', unitName: 'Ban QLDA ĐTXD phường Bình Thới' }
          ];
          napDonViVaoGiaoDien(dsDonViGoc);
          baoLoi('', '');
        }
      })
      .catch(function (err) {
        console.warn('Lỗi tải đơn vị:', err);
        // Fallback đơn vị thử nghiệm
        dsDonViGoc = [
          { unitCode: 'BQLDA.BinhThoi', unitName: 'Ban QLDA ĐTXD phường Bình Thới' }
        ];
        napDonViVaoGiaoDien(dsDonViGoc);
        baoLoi('', '');
      });
  }

  function napDonViVaoGiaoDien(ds) {
    // 1. Nạp dropdown
    if (elSelectDonVi) {
      elSelectDonVi.innerHTML = '<option value="">-- Chọn đơn vị báo cáo --</option>';
      ds.forEach(function (dv) {
        var opt = DOM.tao('option', { value: dv.unitCode }, dv.unitName);
        elSelectDonVi.appendChild(opt);
      });
    }

    // 2. Nạp danh sách chọn nhanh
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
        chonDonVi(dv.unitCode);
      });

      elListChonNhanh.appendChild(li);
    });
  }

  function chonDonVi(unitCode) {
    if (elSelectDonVi) elSelectDonVi.value = unitCode;
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

    if (!unitCode) {
      baoLoi('Vui lòng chọn đơn vị báo cáo.');
      if (elSelectDonVi) elSelectDonVi.focus();
      return;
    }
    if (!email) {
      baoLoi('Vui lòng nhập địa chỉ Gmail được cấp quyền.');
      if (elInputEmail) elInputEmail.focus();
      return;
    }

    baoLoi('', '');
    datTrangThaiNut(true);

    API.dangNhap(email, unitCode)
      .then(function (res) {
        datTrangThaiNut(false);
        if (!res.ok) {
          baoLoi(res.loi || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
          return;
        }

        // Lưu thông tin phiên đăng nhập
        var thongTinPhien = {
          email: email,
          unitCode: unitCode,
          unitName: res.unitName || (elSelectDonVi.options[elSelectDonVi.selectedIndex] || {}).text || unitCode,
          role: res.role || 'Nhập liệu',
          tables: res.tables || []
        };
        PHIEN.luu(thongTinPhien);

        // Chuyển sang màn hình nhập liệu
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
