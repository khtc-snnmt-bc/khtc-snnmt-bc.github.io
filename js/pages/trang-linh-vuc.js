// ============================================================
// bcsnn · js/pages/trang-linh-vuc.js
// Vai trò  : Trang một lĩnh vực (/BTTDC, /Nhiem_Vu, /BC_xa): dựng khung đăng nhập + nhập liệu
//            rồi điều khiển luồng — đăng nhập → nhập liệu (chỉ bảng của lĩnh vực) → đăng xuất
// Lớp      : pages — được gọi bởi: <thư mục lĩnh vực>/index.html · được phép gọi: domains, services, utils, config
// Phiên bản: 0.1.0 · Cập nhật: 10/10/2026 13:50
// ============================================================
// Trang lĩnh vực chỉ ghi <body data-linh-vuc="<thư mục>"> và nạp script; khung HTML nằm ở đây
// để ba lĩnh vực dùng chung một bản. Đăng nhập, vé nhớ chung cả ba (cùng địa chỉ gốc).

(function () {
  'use strict';

  var GOC = '../';   // trang lĩnh vực nằm trong thư mục con của gốc app

  function khungHtml() {
    return '' +
      // ===== Đăng nhập: thẻ trắng 2 cột — trái nhập, phải chọn nhanh đơn vị =====
      '<div id="trang-dang-nhap" class="login-page-wrapper an">' +
      '  <button id="btn-quay-lai-dieu-huong" class="btn-back" type="button">← Chọn lĩnh vực khác</button>' +
      '  <div class="login-card">' +
      '    <div class="login-form-pane">' +
      '      <div class="login-brand">' +
      '        <img src="' + GOC + 'img/logo.svg" alt="" class="login-brand-logo">' +
      '        <div>' +
      '          <div class="login-brand-org">Sở Nông nghiệp và Môi trường</div>' +
      '          <h2 id="tieu-de-dang-nhap"></h2>' +
      '        </div>' +
      '      </div>' +
      '      <div id="thong-bao-dang-nhap" class="alert an"></div>' +
      '      <form id="form-dang-nhap" onsubmit="return false;">' +
      '        <div class="login-field">' +
      '          <label for="input-don-vi">Đơn vị báo cáo</label>' +
      '          <input type="text" id="input-don-vi" class="form-control" list="ds-don-vi" placeholder="Gõ tên đơn vị hoặc chọn nhanh ở bên phải" autocomplete="off">' +
      '          <datalist id="ds-don-vi"></datalist>' +
      '        </div>' +
      '        <div class="login-field">' +
      '          <label for="input-email">Người nhập</label>' +
      '          <input type="email" id="input-email" class="form-control" list="ds-tai-khoan" placeholder="Bấm để chọn tài khoản hoặc gõ Gmail" autocomplete="off">' +
      '          <datalist id="ds-tai-khoan"></datalist>' +
      '        </div>' +
      '        <button id="btn-dang-nhap" type="submit" class="btn-login-main">Đăng nhập</button>' +
      '        <p class="login-ghi-chu">Đã đăng nhập Google trên trình duyệt thì bấm Đăng nhập, không cần nhập mật khẩu.</p>' +
      '      </form>' +
      '    </div>' +
      '    <div class="quick-select-pane">' +
      '      <div class="quick-filter-box">' +
      '        <h4>Chọn nhanh đơn vị</h4>' +
      '        <input type="text" id="loc-don-vi" class="form-control" placeholder="Lọc theo tên đơn vị …">' +
      '      </div>' +
      '      <ul id="danh-sach-chon-nhanh" class="quick-units-list"></ul>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      // ===== Nhập liệu: thanh bên bảng được giao + nhúng Google Sheet thật =====
      '<div id="trang-nhap-lieu" class="workspace-container an">' +
      '  <div class="workspace-body">' +
      '    <aside class="workspace-sidebar">' +
      '      <div class="sidebar-brand">' +
      '        <img src="' + GOC + 'img/logo.svg" alt="" class="brand-logo">' +
      '        <div class="brand-text">' +
      '          <span class="app-title">Báo cáo định kỳ<br>Sở Nông nghiệp và Môi trường</span>' +
      '          <span id="ten-ngan-linh-vuc" class="sub-title"></span>' +
      '        </div>' +
      '      </div>' +
      '      <div class="sidebar-user">' +
      '        <div id="nhap-lieu-user-badge" class="user-badge an"></div>' +
      '        <button id="btn-dang-xuat" class="btn-logout an">Đăng xuất</button>' +
      '      </div>' +
      '      <div class="sidebar-section-title">Bảng báo cáo</div>' +
      '      <ul id="danh-sach-bang-sidebar" class="sidebar-tables-list"></ul>' +
      '      <div class="sidebar-footer">' +
      '        <a id="lien-ket-quan-tri" class="sidebar-btn an" href="' + GOC + 'quantri.html">Quản trị</a>' +
      '        <button id="btn-mo-tab-moi" class="sidebar-btn sidebar-btn-primary">Không tải được bảng! Bấm vào đây để nhập trên Google Sheet ↗</button>' +
      '        <button id="btn-tai-lai-iframe" class="sidebar-btn">Tải lại báo cáo ↻</button>' +
      '      </div>' +
      '    </aside>' +
      '    <section class="workspace-main">' +
      '      <div class="iframe-wrapper">' +
      '        <iframe id="khung-nhung-sheet" class="sheet-iframe" title="Google Sheet báo cáo"></iframe>' +
      '      </div>' +
      '    </section>' +
      '  </div>' +
      '</div>';
  }

  function batDau() {
    var lv = LINH_VUC.layTheoThuMuc(document.body.getAttribute('data-linh-vuc'));
    if (!lv) { location.replace(GOC); return; }
    PHIEN.luuLinhVuc(lv.thuMuc);

    document.body.insertAdjacentHTML('afterbegin', khungHtml());
    DOM.$('#tieu-de-dang-nhap').textContent = lv.ten;
    DOM.$('#ten-ngan-linh-vuc').textContent = lv.tenNgan;

    var elUserBadge = DOM.$('#nhap-lieu-user-badge');
    var elBtnLogout = DOM.$('#btn-dang-xuat');

    // Phiên giữ mọi bảng GAS trả; trang này chỉ hiện bảng của lĩnh vực mình
    function hienNhapLieu(phien) {
      var rieng = Object.assign({}, phien, { tables: LINH_VUC.locBang(phien.tables, lv.group) });
      DOM.hien(elUserBadge);
      DOM.hien(elBtnLogout);
      PAGE_NHAP_LIEU.hien(rieng);
    }

    PAGE_DANG_NHAP.khoiTao(
      hienNhapLieu,
      function () { location.href = GOC; },   // ← Chọn lĩnh vực khác
      { google: true }
    );

    PAGE_NHAP_LIEU.khoiTao(function () {      // Đăng xuất → về đăng nhập của lĩnh vực này
      DOM.an(elUserBadge);
      DOM.an(elBtnLogout);
      PAGE_DANG_NHAP.hien();
    });

    // Phiên trong tab này, hoặc vé nhớ đăng nhập: vào thẳng bằng dữ liệu nhớ, rồi LUÔN hỏi
    // GAS ngầm — danh sách bảng / file đơn vị đổi sau khi đăng nhập (VD vừa Tạo kỳ) thì vẽ lại
    var phien = PHIEN.doc();
    var nho = PHIEN.docNho();
    if (!phien && nho) {
      phien = nho.phien;
      PHIEN.luu(phien);
    }
    if (phien && phien.congKhai) {
      // Vào không cần đăng nhập (bảng công khai): chỉ giữ trong tab này, không có vé
      PAGE_DANG_NHAP.lamMoiCongKhai(phien, hienNhapLieu, function () { location.reload(); });
    } else if (nho && phien && nho.phien.email === phien.email) {
      PAGE_DANG_NHAP.lamMoiTuVe({ ve: nho.ve, phien: phien }, hienNhapLieu, function () { location.reload(); });
    }
    if (phien && phien.unitCode && (phien.email || phien.congKhai)) {
      hienNhapLieu(phien);
    } else {
      PAGE_DANG_NHAP.hien();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', batDau);
  } else {
    batDau();
  }
})();
