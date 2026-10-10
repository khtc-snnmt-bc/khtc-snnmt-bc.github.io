// ============================================================
// bcsnn · js/pages/dang-nhap.js
// Vai trò  : Màn hình đăng nhập lĩnh vực (pptx trang 2): chọn đơn vị ↔ nhập Gmail hai chiều
//            Hai cách, cùng giao diện: trang lĩnh vực (trang-linh-vuc.js) — Google xác minh Gmail;
//            index2.html — tin Gmail đã gõ (cách cũ, giữ tới khi chốt b06h)
//            Bảng công khai: chọn đơn vị, để trống Gmail → vào thẳng các bảng công khai
// Lớp      : pages — được gọi bởi: trang-linh-vuc.js, index2.html · được phép gọi: domains, services, utils, config
// Phiên bản: 0.12.0 · Cập nhật: 10/10/2026 14:10
// ============================================================

var PAGE_DANG_NHAP = (function () {
  'use strict';

  var MAU_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var TRE_GO_EMAIL = 450; // ms chờ người dùng gõ xong Gmail rồi mới hỏi GAS

  var dsDonViGoc = [];
  var donViDangChon = null;   // { unitCode, unitName } hoặc null
  var taiKhoanTheoDonVi = {}; // bộ nhớ đệm: unitCode → [email]
  var congKhaiTheoDonVi = {}; // unitCode → true: có bảng nhập không cần đăng nhập
  var luotHoiEmail = 0;       // bỏ qua kết quả trả về muộn của lần hỏi cũ
  var hen = null;
  var elTrang, elInputDonVi, elDsDonVi, elInputLoc, elListChonNhanh, elInputEmail, elDsTaiKhoan;
  var elBtnDangNhap, elThongBao, elBtnQuayLai;
  var onDangNhapThanhCong, onQuayLaiCallback;
  var laGoogle = false;       // true: Google xác minh Gmail (trang lĩnh vực) · false: tin Gmail đã gõ (index2.html)
  var locDonVi = function (ds) { return ds; };   // trang lĩnh vực: chỉ đơn vị của lĩnh vực

  /**
   * @param {object} [tuyChon] — { google: true } bật cách đăng nhập mới;
   *   { locDonVi: fn(ds) → ds } lọc danh sách đơn vị (ô chọn, kết quả tìm theo Gmail)
   */
  function khoiTao(callbackThanhCong, callbackQuayLai, tuyChon) {
    onDangNhapThanhCong = callbackThanhCong;
    onQuayLaiCallback = callbackQuayLai;
    laGoogle = !!(tuyChon && tuyChon.google);
    if (tuyChon && typeof tuyChon.locDonVi === 'function') locDonVi = tuyChon.locDonVi;

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
    xoaDanhSachTaiKhoan();
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
          dsDonViGoc = DON_VI.sapXepDonVi(locDonVi(res.donVi));
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
    // Hai nhóm Quản trị / Đơn vị báo cáo; trong nhóm, đơn vị dùng gần đây lên đầu (ngầm)
    DON_VI.nhomChonNhanh(ds, PHIEN.docGanDay()).forEach(function (nhom) {
      var lop = nhom.ten === 'Quản trị' ? ' nhom-quan-tri' : ' nhom-don-vi';
      elListChonNhanh.appendChild(DOM.tao('li', { class: 'quick-group-label' + lop }, nhom.ten));
      nhom.ds.forEach(function (dv) {
        var li = DOM.tao('li', {
          class: 'quick-unit-item' + lop + (dv.unitCode === maDangChon ? ' selected' : ''),
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

  // Hộp xổ ở ô Gmail: Gmail của đơn vị đang chọn (nếu có) rồi tới Gmail đã đăng nhập gần đây
  function xoaDanhSachTaiKhoan() {
    napDatalistTaiKhoan([]);
  }

  function taiTaiKhoanCuaDonVi(unitCode) {
    xoaDanhSachTaiKhoan();
    var coSan = taiKhoanTheoDonVi[unitCode];
    if (coSan) { napDatalistTaiKhoan(coSan); return; }
    API.layTaiKhoan(unitCode)
      .then(function (res) {
        if (!res.ok) return;
        taiKhoanTheoDonVi[unitCode] = res.emails || [];
        congKhaiTheoDonVi[unitCode] = !!res.congKhai;
        // Người dùng đã đổi sang đơn vị khác trong lúc chờ → bỏ kết quả
        if (donViDangChon && donViDangChon.unitCode === unitCode) napDatalistTaiKhoan(taiKhoanTheoDonVi[unitCode]);
      })
      .catch(function () { /* im lặng: vẫn gõ tay Gmail được */ });
  }

  function napDatalistTaiKhoan(dsEmail) {
    elDsTaiKhoan.innerHTML = '';
    var tatCa = dsEmail.concat(PHIEN.docEmailGanDay().filter(function (e) { return dsEmail.indexOf(e) < 0; }));
    tatCa.forEach(function (email) {
      elDsTaiKhoan.appendChild(DOM.tao('option', { value: email }));
    });
  }

  function timDonViTheoEmailDaGo() {
    var email = elInputEmail.value.trim().toLowerCase();
    if (!MAU_EMAIL.test(email)) return;
    var luot = ++luotHoiEmail;
    API.timDonViTheoEmail(email)
      .then(function (res) {
        if (luot !== luotHoiEmail || !res.ok || !res.donVi) return;
        // Chỉ nhận đơn vị có trong danh sách của trang (trang lĩnh vực đã lọc)
        var ds = res.donVi.filter(function (d) { return dsDonViGoc.some(function (g) { return g.unitCode === d.unitCode; }); });
        if (!ds.length) return;
        // Đã chọn đúng một đơn vị của Gmail này rồi thì giữ nguyên
        var daDung = donViDangChon && ds.some(function (d) { return d.unitCode === donViDangChon.unitCode; });
        if (daDung) return;
        chonDonVi(ds[0], true);
      })
      .catch(function () { /* im lặng: bấm Đăng nhập sẽ báo lỗi cụ thể */ });
  }

  // ---------- Đăng nhập ----------

  function xuLyDangNhap() {
    var email = elInputEmail.value.trim().toLowerCase();

    // Cách Google: chưa gõ Gmail vẫn được — Google cho chọn tài khoản
    if (!email && !laGoogle) {
      baoLoi('Vui lòng nhập Gmail được cấp quyền nhập liệu.');
      elInputEmail.focus();
      return;
    }
    // Chưa chọn đơn vị vẫn đăng nhập được: máy chủ tự suy đơn vị từ Gmail
    var maDonVi = donViDangChon ? donViDangChon.unitCode : '';

    baoLoi('');
    clearTimeout(hen);
    luotHoiEmail++; // bỏ kết quả tìm đơn vị theo Gmail còn đang chờ
    datTrangThaiNut(true);

    // Để trống Gmail mà đơn vị có bảng công khai → vào thẳng, không qua Google.
    // Cửa sổ Google phải mở ngay trong lượt bấm → gọi layMaGoogle trước mọi việc chờ
    var hoi = laGoogle && !email && congKhaiTheoDonVi[maDonVi]
      ? API.vaoCongKhai(maDonVi)
      : laGoogle
      ? API.layMaGoogle(email).then(
          function (ma) { return API.dangNhapGoogle(ma, maDonVi); },
          function (err) { return { ok: false, loi: err.message }; })
      : API.dangNhap(email, maDonVi);

    hoi
      .then(function (res) {
        datTrangThaiNut(false);
        if (!res.ok) {
          if (res.donVi && res.donVi.length) elInputDonVi.focus();
          baoLoi(res.loi || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
          return;
        }
        email = res.congKhai ? '' : res.email || email; // cách Google: Gmail do Google xác nhận
        var thongTinPhien = {
          email: email,
          unitCode: res.unitCode || maDonVi,
          unitName: res.unitName || (donViDangChon && donViDangChon.unitName) || res.unitCode,
          role: res.role || 'Nhập liệu',
          tables: res.tables || []
        };
        if (res.congKhai) thongTinPhien.congKhai = true;
        PHIEN.luu(thongTinPhien);
        if (res.ve) PHIEN.luuNho(thongTinPhien, res.ve);
        PHIEN.ghiGanDay(thongTinPhien.unitCode);
        if (email) PHIEN.ghiEmailGanDay(email);
        napDatalistTaiKhoan([]);
        an();
        if (typeof onDangNhapThanhCong === 'function') onDangNhapThanhCong(thongTinPhien);
      })
      .catch(function () {
        datTrangThaiNut(false);
        baoLoi('Không kết nối được máy chủ. Vui lòng thử lại sau ít phút.');
      });
  }

  /**
   * Mở bằng vé nhớ: trang đã vào thẳng bằng dữ liệu nhớ, giờ hỏi GAS ngầm.
   * @param {function(object)} khiDoi — danh sách bảng đã đổi → vẽ lại
   * @param {function()} khiHong — GAS không nhận vé / Gmail đã bị gỡ → về đăng nhập
   */
  function lamMoiTuVe(nho, khiDoi, khiHong) {
    API.dangNhapVe(nho.ve, nho.phien.unitCode)
      .then(function (res) {
        if (!res.ok) { PHIEN.xoa(); khiHong(); return; }
        var moi = {
          email: res.email || nho.phien.email,
          unitCode: res.unitCode,
          unitName: res.unitName || res.unitCode,
          role: res.role || 'Nhập liệu',
          tables: res.tables || []
        };
        PHIEN.luu(moi);
        PHIEN.luuNho(moi, nho.ve);
        if (JSON.stringify(moi) !== JSON.stringify(nho.phien)) khiDoi(moi);
      })
      .catch(function () { /* mất mạng: cứ dùng dữ liệu nhớ */ });
  }

  /** Phiên không cần đăng nhập (bảng công khai): mở / tải lại trang thì hỏi GAS ngầm như lamMoiTuVe. */
  function lamMoiCongKhai(phien, khiDoi, khiHong) {
    API.vaoCongKhai(phien.unitCode)
      .then(function (res) {
        if (!res.ok) { PHIEN.xoa(); khiHong(); return; }
        var moi = { email: '', unitCode: res.unitCode, unitName: res.unitName || res.unitCode,
          role: res.role || 'Nhập liệu', tables: res.tables || [], congKhai: true };
        PHIEN.luu(moi);
        if (JSON.stringify(moi) !== JSON.stringify(phien)) khiDoi(moi);
      })
      .catch(function () { /* mất mạng: cứ dùng dữ liệu nhớ */ });
  }

  function hien() {
    DOM.hien(elTrang);
    if (!dsDonViGoc.length) taiDanhSachDonVi();
  }

  function an() {
    DOM.an(elTrang);
  }

  return { khoiTao: khoiTao, hien: hien, an: an, lamMoiTuVe: lamMoiTuVe, lamMoiCongKhai: lamMoiCongKhai };
})();
