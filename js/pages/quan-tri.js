// ============================================================
// bcsnn · js/pages/quan-tri.js
// Vai trò  : Trang quản trị (pptx trang 4): mật khẩu quản trị, menu Quản lý,
//            mục Tài khoản (Gmail theo đơn vị) và Phân quyền (giao bảng, đơn vị quản lý)
// Lớp      : pages — được gọi bởi: quantri.html · được phép gọi: domains, services, utils, config
// Phiên bản: 0.3.0 · Cập nhật: 06/10/2026 21:03
// ============================================================
// Chưa đăng nhập nhập liệu, hoặc không phải vai trò Quản trị → về index.html.
// Mật khẩu đúng → GAS trả mã phiên (6 giờ, giữ tới khi đóng tab). Mọi việc
// quản trị gửi kèm mã phiên; GAS trả hetPhien → hỏi lại mật khẩu.
// Lưu xong GAS tự chia sẻ / gỡ quyền file Drive cho khớp.

var PAGE_QUAN_TRI = (function () {
  'use strict';

  var MUC = [
    { ma: 'ky', ten: 'Kỳ báo cáo' },
    { ma: 'tai-khoan', ten: 'Tài khoản' },
    { ma: 'phan-quyen', ten: 'Phân quyền' },
    { ma: 'bang', ten: 'Quản lý bảng' }
  ];

  var phien, elMenu, elTieuDe, elKhoa, elNoiDung, elThongBao, elMatKhau, elNut;
  var duLieu = null;          // { donVi, taiKhoan, bang, giao } từ GAS
  var mucDangChon = MUC[0];
  var chon = { bang: '' };

  function khoiTao() {
    phien = PHIEN.doc();
    if (!PHIEN.laQuanTri(phien)) {
      location.replace('index.html');
      return;
    }
    elMenu = DOM.$('#qt-menu');
    elTieuDe = DOM.$('#qt-tieu-de');
    elKhoa = DOM.$('#qt-mat-khau');
    elNoiDung = DOM.$('#qt-noi-dung');
    elThongBao = DOM.$('#qt-thong-bao');
    elMatKhau = DOM.$('#input-mat-khau');
    elNut = DOM.$('#btn-mat-khau');

    var badge = DOM.$('#qt-user-badge');
    badge.appendChild(DOM.tao('span', { class: 'don-vi' }, phien.unitName || phien.unitCode));
    badge.appendChild(DOM.tao('span', { class: 'email' }, phien.email));
    DOM.$('#input-ten-qt').value = phien.email;

    DOM.$('#form-mat-khau').addEventListener('submit', function (e) {
      e.preventDefault();
      guiMatKhau();
    });

    if (PHIEN.conHanQuanTri(PHIEN.docQuanTri(), Date.now())) moKhoa();
    else hienMatKhau();
  }

  function hienMatKhau() {
    DOM.an(elMenu);
    DOM.an(DOM.$('#qt-menu-tieu-de'));
    DOM.an(elNoiDung);
    DOM.hien(elKhoa);
    elTieuDe.textContent = 'Quản trị';
    elMatKhau.focus();
  }

  function guiMatKhau() {
    if (!elMatKhau.value) return;
    DOM.an(elThongBao);
    elNut.disabled = true;
    elNut.innerHTML = '<span class="spinner"></span>Đang kiểm tra…';

    API.quanTriDangNhap(phien.email, phien.unitCode, elMatKhau.value)
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.loi) || 'Không đăng nhập được');
        PHIEN.luuQuanTri(res.token, res.hetHanSau, Date.now());
        elMatKhau.value = '';
        moKhoa();
      })
      .catch(function (err) {
        elThongBao.textContent = err.message;
        DOM.hien(elThongBao);
        elMatKhau.select();
      })
      .then(function () {
        elNut.disabled = false;
        elNut.textContent = 'Vào trang quản trị';
      });
  }

  function moKhoa() {
    DOM.an(elKhoa);
    DOM.hien(elNoiDung);
    DOM.hien(elMenu);
    DOM.hien(DOM.$('#qt-menu-tieu-de'));
    veMenu();
    taiDuLieu();
  }

  function token() {
    var pq = PHIEN.docQuanTri();
    return pq ? pq.token : '';
  }

  /** Phiên quản trị hết hạn trên máy chủ → hỏi lại mật khẩu. */
  function kiemPhien(res) {
    if (res && res.hetPhien) {
      PHIEN.xoaQuanTri();
      duLieu = null;
      hienMatKhau();
      throw new Error('Phiên quản trị đã hết hạn');
    }
    if (!res || !res.ok) throw new Error((res && res.loi) || 'Máy chủ không trả lời');
    return res;
  }

  function taiDuLieu() {
    duLieu = null;
    veNoiDung();
    API.qtLayDuLieu(token())
      .then(kiemPhien)
      .then(function (res) {
        duLieu = { donVi: PHAN_QUYEN.xepDonVi(res.donVi), taiKhoan: res.taiKhoan, bang: res.bang, giao: res.giao };
        veNoiDung();
      })
      .catch(function (err) {
        if (!elKhoa.classList.contains('an')) return;
        elNoiDung.innerHTML = '';
        elNoiDung.appendChild(DOM.tao('div', { class: 'qt-khung' })).appendChild(thongBao(err.message, true));
      });
  }

  function veMenu() {
    elMenu.innerHTML = '';
    MUC.forEach(function (muc) {
      var li = DOM.tao('li', { class: 'sidebar-table-item', 'data-muc': muc.ma }, muc.ten);
      li.addEventListener('click', function () { chonMuc(muc); });
      elMenu.appendChild(li);
    });
    chonMuc(mucDangChon);
  }

  function chonMuc(muc) {
    mucDangChon = muc;
    DOM.$$('.sidebar-table-item', elMenu).forEach(function (li) {
      DOM.batTat(li, 'active', li.getAttribute('data-muc') === muc.ma);
    });
    elTieuDe.textContent = muc.ten;
    veNoiDung();
  }

  function veNoiDung() {
    elNoiDung.innerHTML = '';
    if (mucDangChon.ma !== 'tai-khoan' && mucDangChon.ma !== 'phan-quyen') return;
    var khung = elNoiDung.appendChild(DOM.tao('div', { class: 'qt-khung' }));
    if (!duLieu) {
      khung.appendChild(DOM.tao('p', { class: 'qt-dang-tai' }, 'Đang tải…'));
      return;
    }
    if (mucDangChon.ma === 'tai-khoan') veTaiKhoan(khung);
    else vePhanQuyen(khung);
  }

  // ---------- Phần tử dùng chung ----------

  function thongBao(chu, laLoi) {
    return DOM.tao('div', { class: 'alert ' + (laLoi ? 'alert-error' : 'alert-ok') }, chu);
  }

  function oChon(dsLuaChon, giaTri) {
    var sel = DOM.tao('select', { class: 'form-control' });
    dsLuaChon.forEach(function (lc) {
      var op = DOM.tao('option', { value: lc.giaTri }, lc.nhan);
      if (lc.giaTri === giaTri) op.selected = true;
      sel.appendChild(op);
    });
    return sel;
  }

  function dong(nhan, phanTu) {
    var d = DOM.tao('label', { class: 'qt-dong' });
    d.appendChild(DOM.tao('span', { class: 'qt-nhan' }, nhan));
    d.appendChild(phanTu);
    return d;
  }

  function tenDonVi(uc) {
    var d = duLieu.donVi.filter(function (x) { return x.unitCode === uc; })[0];
    return d ? d.unitName : uc;
  }

  function luaChonDonVi() {
    return duLieu.donVi.map(function (d) { return { giaTri: d.unitCode, nhan: d.unitName }; });
  }

  /** Nút Lưu: chờ GAS, báo kết quả ngay dưới nút. */
  function nutLuu(khung, goiLuu, sauKhiLuu) {
    var hang = khung.appendChild(DOM.tao('div', { class: 'qt-hang-nut' }));
    var nut = hang.appendChild(DOM.tao('button', { type: 'button', class: 'btn-login-main qt-nut-luu' }, 'Lưu'));
    var bao = khung.appendChild(DOM.tao('div'));
    nut.addEventListener('click', function () {
      nut.disabled = true;
      nut.innerHTML = '<span class="spinner"></span>Đang lưu…';
      bao.innerHTML = '';
      goiLuu()
        .then(kiemPhien)
        .then(function (res) {
          sauKhiLuu(res);
          veNoiDung();
          var baoMoi = DOM.$('.qt-khung', elNoiDung).appendChild(DOM.tao('div'));
          baoMoi.appendChild(thongBao(PHAN_QUYEN.tomTatLuu(res, tenDonVi), res.quyen && res.quyen.loi.length));
        })
        .catch(function (err) {
          bao.appendChild(thongBao(err.message, true));
          nut.disabled = false;
          nut.textContent = 'Lưu';
        });
    });
  }

  // ---------- Tài khoản ----------

  // Mỗi đơn vị một khối: dòng đầu tên đơn vị, dưới là Gmail. Khối nào sửa thì
  // hiện nút Lưu của khối đó; lưu xong chỉ vẽ lại khối đó (khối khác giữ phần đang sửa).
  function veTaiKhoan(khung) {
    var loc = khung.appendChild(DOM.tao('input', { type: 'search', class: 'form-control qt-loc', placeholder: 'Lọc đơn vị…' }));
    var luoi = khung.appendChild(DOM.tao('div', { class: 'qt-luoi-khoi' }));
    duLieu.donVi.forEach(function (d) { luoi.appendChild(veKhoiTaiKhoan(d)); });
    loc.addEventListener('input', function () {
      var hien = PHAN_QUYEN.locDonVi(duLieu.donVi, loc.value).map(function (d) { return d.unitCode; });
      DOM.$$('.qt-khoi', luoi).forEach(function (el) {
        DOM.batTat(el, 'an', hien.indexOf(el.getAttribute('data-ma')) < 0);
      });
    });
  }

  function veKhoiTaiKhoan(d) {
    var khoi = DOM.tao('section', { class: 'qt-khoi', 'data-ma': d.unitCode });
    khoi.appendChild(DOM.tao('div', { class: 'qt-khoi-dau' }, d.unitName));
    var ds = khoi.appendChild(DOM.tao('div', { class: 'qt-ds-gmail' }));
    var chan = khoi.appendChild(DOM.tao('div', { class: 'qt-khoi-chan' }));
    var them = chan.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, '+ Thêm Gmail'));
    var nut = chan.appendChild(DOM.tao('button', { type: 'button', class: 'btn-login-main qt-nut-luu an' }, 'Lưu'));
    var bao = khoi.appendChild(DOM.tao('div'));

    function daSua() { DOM.hien(nut); bao.innerHTML = ''; }

    function themDong(tk) {
      var hang = ds.appendChild(DOM.tao('div', { class: 'qt-gmail' }));
      var o = hang.appendChild(DOM.tao('input', { type: 'email', class: 'form-control', placeholder: 'Gmail', value: tk.email || '' }));
      hang.appendChild(oChon(PHAN_QUYEN.VAI_TRO.map(function (v) { return { giaTri: v, nhan: v }; }),
        tk.role || PHAN_QUYEN.VAI_TRO[0]));
      var xoa = hang.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-xoa', title: 'Gỡ Gmail này' }, '×'));
      xoa.addEventListener('click', function () { hang.remove(); daSua(); });
      return o;
    }
    PHAN_QUYEN.taiKhoanCuaDonVi(duLieu.taiKhoan, d.unitCode).forEach(themDong);
    ds.addEventListener('input', daSua);
    ds.addEventListener('change', daSua);
    them.addEventListener('click', function () { themDong({}).focus(); daSua(); });

    nut.addEventListener('click', function () {
      var dsMoi = DOM.$$('.qt-gmail', ds).map(function (h) {
        return { email: DOM.$('input', h).value.trim(), role: DOM.$('select', h).value };
      }).filter(function (t) { return t.email; });
      nut.disabled = true;
      nut.innerHTML = '<span class="spinner"></span>Đang lưu…';
      bao.innerHTML = '';
      API.qtLuuTaiKhoan(token(), d.unitCode, dsMoi)
        .then(kiemPhien)
        .then(function (res) {
          duLieu.taiKhoan = PHAN_QUYEN.thayTaiKhoan(duLieu.taiKhoan, d.unitCode, dsMoi);
          var moi = veKhoiTaiKhoan(d);
          khoi.replaceWith(moi);
          moi.appendChild(thongBao(PHAN_QUYEN.tomTatLuu(res, tenDonVi), res.quyen && res.quyen.loi.length));
        })
        .catch(function (err) {
          bao.appendChild(thongBao(err.message, true));
          nut.disabled = false;
          nut.textContent = 'Lưu';
        });
    });
    return khoi;
  }

  // ---------- Phân quyền ----------

  function vePhanQuyen(khung) {
    if (!duLieu.bang.length) {
      khung.appendChild(DOM.tao('p', { class: 'qt-dang-tai' }, 'Chưa có bảng nào.'));
      return;
    }
    if (!chon.bang) chon.bang = duLieu.bang[0].tableCode;
    var bangChon = duLieu.bang.filter(function (b) { return b.tableCode === chon.bang; })[0];

    var selBang = oChon(duLieu.bang.map(function (b) { return { giaTri: b.tableCode, nhan: b.tableName }; }), chon.bang);
    selBang.addEventListener('change', function () { chon.bang = selBang.value; veNoiDung(); });
    khung.appendChild(dong('Bảng', selBang));

    var selQl = oChon([{ giaTri: '', nhan: '—' }].concat(luaChonDonVi()), bangChon.managerUnit);
    khung.appendChild(dong('Đơn vị quản lý', selQl));

    var giao = PHAN_QUYEN.giaoCuaBang(duLieu.giao, chon.bang);
    var tieuDe = khung.appendChild(DOM.tao('div', { class: 'qt-dong' }));
    tieuDe.appendChild(DOM.tao('span', { class: 'qt-nhan' }, 'Đơn vị được giao'));
    var loc = tieuDe.appendChild(DOM.tao('input', { type: 'search', class: 'form-control', placeholder: 'Lọc đơn vị…' }));

    var luoi = khung.appendChild(DOM.tao('div', { class: 'qt-luoi-don-vi' }));
    duLieu.donVi.forEach(function (d) {
      var nhan = luoi.appendChild(DOM.tao('label', { class: 'qt-o-don-vi', 'data-ma': d.unitCode }));
      var o = nhan.appendChild(DOM.tao('input', { type: 'checkbox', value: d.unitCode }));
      o.checked = d.unitCode in giao;
      if (giao[d.unitCode]) { o.disabled = true; nhan.title = 'Đã có file'; }
      nhan.appendChild(DOM.tao('span', {}, d.unitName));
    });
    loc.addEventListener('input', function () {
      var hien = PHAN_QUYEN.locDonVi(duLieu.donVi, loc.value).map(function (d) { return d.unitCode; });
      DOM.$$('.qt-o-don-vi', luoi).forEach(function (el) {
        DOM.batTat(el, 'an', hien.indexOf(el.getAttribute('data-ma')) < 0);
      });
    });

    nutLuu(khung, function () {
      var dsDv = DOM.$$('input:checked', luoi).map(function (o) { return o.value; });
      return API.qtLuuPhanQuyen(token(), chon.bang, selQl.value, dsDv).then(function (res) {
        if (res && res.ok) { res.dsDv = dsDv; res.ql = selQl.value; }
        return res;
      });
    }, function (res) {
      bangChon.managerUnit = res.ql;
      duLieu.giao = PHAN_QUYEN.thayGiao(duLieu.giao, chon.bang, res.dsDv);
    });
  }

  return { khoiTao: khoiTao };
})();
