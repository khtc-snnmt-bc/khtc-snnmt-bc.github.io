// ============================================================
// bcsnn · js/pages/nhap-lieu.js
// Vai trò  : Màn hình nhập liệu (pptx trang 3): sidebar biểu được giao, nhúng Sheet thật
// Lớp      : pages — được gọi bởi: app (index.html) · được phép gọi: domains, services, utils, config
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 07:25
// ============================================================

var PAGE_NHAP_LIEU = (function () {
  'use strict';

  var elTrang, elUserBadge, elBtnLogout, elListTables, elIframe, elSheetTitle;
  var elBtnMoTabMoi, elBtnDangNhapGoogle, elBtnTaiLaiIframe;
  var phienHienTai = null;
  var bangDangChon = null;
  var onDangXuatCallback = null;

  function khoiTao(callbackDangXuat) {
    onDangXuatCallback = callbackDangXuat;
    elTrang = DOM.$('#trang-nhap-lieu');
    elUserBadge = DOM.$('#nhap-lieu-user-badge');
    elBtnLogout = DOM.$('#btn-dang-xuat');
    elListTables = DOM.$('#danh-sach-bang-sidebar');
    elIframe = DOM.$('#khung-nhung-sheet');
    elSheetTitle = DOM.$('#tieu-de-bang-hien-tai');
    elBtnMoTabMoi = DOM.$('#btn-mo-tab-moi');
    elBtnDangNhapGoogle = DOM.$('#btn-dang-nhap-google');
    elBtnTaiLaiIframe = DOM.$('#btn-tai-lai-iframe');

    ganSuKien();
  }

  function ganSuKien() {
    if (elBtnLogout) {
      elBtnLogout.addEventListener('click', function (e) {
        e.preventDefault();
        xuLyDangXuat();
      });
    }

    if (elBtnMoTabMoi) {
      elBtnMoTabMoi.addEventListener('click', function (e) {
        e.preventDefault();
        moSheetTabMoi();
      });
    }

    if (elBtnDangNhapGoogle) {
      elBtnDangNhapGoogle.addEventListener('click', function (e) {
        e.preventDefault();
        var email = phienHienTai ? phienHienTai.email : '';
        window.open(KY_BAO_CAO.taoUrlDangNhapGoogle(email), '_blank');
      });
    }

    if (elBtnTaiLaiIframe) {
      elBtnTaiLaiIframe.addEventListener('click', function (e) {
        e.preventDefault();
        taiLaiIframe();
      });
    }
  }

  function hien(thongTinPhien) {
    phienHienTai = thongTinPhien;
    DOM.hien(elTrang);

    // 1. Cập nhật thông tin người dùng trên header
    if (elUserBadge) {
      elUserBadge.innerHTML = '<span class="don-vi">' + escapeHtml(phienHienTai.unitName || phienHienTai.unitCode) + '</span>' +
                              '<span class="email">' + escapeHtml(phienHienTai.email) + '</span>';
    }

    // 2. Vẽ danh sách bảng được giao ở sidebar
    veSidebarBang(phienHienTai.tables || []);
  }

  function veSidebarBang(dsBang) {
    if (!elListTables) return;
    elListTables.innerHTML = '';

    if (!dsBang || !dsBang.length) {
      var itemRong = DOM.tao('li', { class: 'sidebar-table-item' }, 'Chưa có bảng báo cáo nào được giao');
      itemRong.style.color = '#888';
      elListTables.appendChild(itemRong);
      datIframeRong();
      return;
    }

    dsBang.forEach(function (b, index) {
      var li = DOM.tao('li', {
        class: 'sidebar-table-item' + (index === 0 ? ' active' : ''),
        'data-table-code': b.tableCode
      });

      li.appendChild(DOM.tao('span', {}, b.tableName || b.tableCode));

      li.addEventListener('click', function () {
        chonBang(b, li);
      });

      elListTables.appendChild(li);
    });

    // Mặc định nạp bảng đầu tiên
    chonBang(dsBang[0], elListTables.firstElementChild);
  }

  function chonBang(bang, elLi) {
    bangDangChon = bang;

    // Cập nhật active class ở sidebar
    var cacLi = DOM.$$('.sidebar-table-item', elListTables);
    cacLi.forEach(function (li) { DOM.batTat(li, 'active', li === elLi); });

    // Cập nhật tiêu đề bảng
    if (elSheetTitle) {
      elSheetTitle.textContent = bang.tableName || bang.tableCode;
    }

    // Nạp iframe Google Sheet
    if (elIframe && bang.fileId) {
      var src = KY_BAO_CAO.taoUrlSheet(bang.fileId, phienHienTai ? phienHienTai.email : '');
      elIframe.src = src;
    }
  }

  function moSheetTabMoi() {
    if (!bangDangChon || !bangDangChon.fileId) return;
    var url = KY_BAO_CAO.taoUrlSheet(bangDangChon.fileId, phienHienTai ? phienHienTai.email : '');
    window.open(url, '_blank');
  }

  function taiLaiIframe() {
    if (elIframe && elIframe.src) {
      var src = elIframe.src;
      elIframe.src = '';
      setTimeout(function () { elIframe.src = src; }, 100);
    }
  }

  function datIframeRong() {
    if (elIframe) elIframe.src = 'about:blank';
    if (elSheetTitle) elSheetTitle.textContent = '—';
  }

  function xuLyDangXuat() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      PHIEN.xoa();
      phienHienTai = null;
      bangDangChon = null;
      datIframeRong();
      an();
      if (typeof onDangXuatCallback === 'function') {
        onDangXuatCallback();
      }
    }
  }

  function an() {
    DOM.an(elTrang);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    khoiTao: khoiTao,
    hien: hien,
    an: an
  };
})();
