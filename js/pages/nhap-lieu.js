// ============================================================
// bcsnn · js/pages/nhap-lieu.js
// Vai trò  : Màn hình nhập liệu (pptx trang 3): sidebar biểu được giao, nhúng Sheet thật
// Lớp      : pages — được gọi bởi: app (index.html) · được phép gọi: domains, services, utils, config
// Phiên bản: 0.7.0 · Cập nhật: 08/10/2026 22:33
// Bảng có donVi (đơn vị quản lý bảng): hộp chọn Bảng tổng / file từng đơn vị dưới tên bảng.
// ============================================================

var PAGE_NHAP_LIEU = (function () {
  'use strict';

  var elTrang, elUserBadge, elBtnLogout, elListTables, elIframe;
  var elBtnMoTabMoi, elBtnTaiLaiIframe;
  var phienHienTai = null;
  var fileDangMo = '';        // fileId đang hiện trong iframe (bảng tổng hoặc file một đơn vị)
  var onDangXuatCallback = null;

  function khoiTao(callbackDangXuat) {
    onDangXuatCallback = callbackDangXuat;
    elTrang = DOM.$('#trang-nhap-lieu');
    elUserBadge = DOM.$('#nhap-lieu-user-badge');
    elBtnLogout = DOM.$('#btn-dang-xuat');
    elListTables = DOM.$('#danh-sach-bang-sidebar');
    elIframe = DOM.$('#khung-nhung-sheet');
    elBtnMoTabMoi = DOM.$('#btn-mo-tab-moi');
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
      // Bảng công khai: vào không cần Gmail → chỉ tên đơn vị
      elUserBadge.innerHTML = '<span class="don-vi">' + escapeHtml(phienHienTai.unitName || phienHienTai.unitCode) + '</span>' +
                              (phienHienTai.email ? '<span class="email">' + escapeHtml(phienHienTai.email) + '</span>' : '');
    }

    // 2. Vẽ danh sách bảng được giao ở sidebar
    veSidebarBang(phienHienTai.tables || []);

    // 3. Vai trò Quản trị thấy lối sang trang quản trị
    DOM.batTat(DOM.$('#lien-ket-quan-tri'), 'an', !PHIEN.laQuanTri(phienHienTai));
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
    // Cập nhật active class ở sidebar
    var cacLi = DOM.$$('.sidebar-table-item', elListTables);
    cacLi.forEach(function (li) { DOM.batTat(li, 'active', li === elLi); });

    // Bảng mình quản lý: hộp chọn Bảng tổng / từng đơn vị ngay dưới tên bảng
    DOM.$$('.sidebar-chon-file', elListTables).forEach(function (el) { el.remove(); });
    var dsFile = KY_BAO_CAO.dsFileBang(bang);
    if (bang.donVi) {
      var sel = DOM.tao('select', { class: 'sidebar-chon-file-o', 'aria-label': 'Chọn file' });
      dsFile.forEach(function (f, i) { sel.appendChild(DOM.tao('option', { value: String(i) }, f.nhan)); });
      sel.addEventListener('change', function () { moFile(bang, dsFile[Number(sel.value)]); });
      var liChon = DOM.tao('li', { class: 'sidebar-chon-file' });
      liChon.appendChild(sel);
      elLi.after(liChon);
    }
    moFile(bang, dsFile[0]);
  }

  /** Nạp iframe Google Sheet (lối dự phòng mở tab mới là nút ở sidebar). */
  function moFile(bang, file) {
    fileDangMo = file ? file.fileId : '';
    if (!fileDangMo) return;
    var src = KY_BAO_CAO.taoUrlSheet(fileDangMo, phienHienTai ? phienHienTai.email : '');
    if (elIframe) elIframe.src = src;
  }

  function moSheetTabMoi() {
    if (!fileDangMo) return;
    window.open(KY_BAO_CAO.taoUrlSheet(fileDangMo, phienHienTai ? phienHienTai.email : ''), '_blank');
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
  }

  function xuLyDangXuat() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      var pq = PHIEN.docQuanTri();
      if (pq && pq.token) API.quanTriDangXuat(pq.token).catch(function () { /* phiên tự hết hạn */ });
      PHIEN.xoaQuanTri();
      PHIEN.xoa();
      phienHienTai = null;
      fileDangMo = '';
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
