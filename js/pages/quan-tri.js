// ============================================================
// bcsnn · js/pages/quan-tri.js
// Vai trò  : Trang quản trị (pptx trang 4): mật khẩu quản trị, menu Quản lý,
//            mục Kỳ báo cáo (tạo kỳ, khoá/mở khoá), Tài khoản (Gmail theo đơn vị)
//            và Phân quyền (giao bảng, đơn vị quản lý)
// Lớp      : pages — được gọi bởi: quantri.html · được phép gọi: domains, services, utils, config
// Phiên bản: 0.5.1 · Cập nhật: 06/10/2026 22:06
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
        duLieu = { donVi: PHAN_QUYEN.xepDonVi(res.donVi), taiKhoan: res.taiKhoan, bang: res.bang, giao: res.giao, ky: res.ky || [] };
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
    var ve = { 'ky': veKyBaoCao, 'tai-khoan': veTaiKhoan, 'phan-quyen': vePhanQuyen }[mucDangChon.ma];
    if (!ve) return;
    var khung = elNoiDung.appendChild(DOM.tao('div', { class: 'qt-khung' }));
    if (!duLieu) {
      khung.appendChild(DOM.tao('p', { class: 'qt-dang-tai' }, 'Đang tải…'));
      return;
    }
    ve(khung);
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

  /** Ô chọn bảng ở đầu mục (dùng chung Kỳ báo cáo / Phân quyền); null nếu chưa có bảng. */
  function chonBang(khung) {
    if (!duLieu.bang.length) {
      khung.appendChild(DOM.tao('p', { class: 'qt-dang-tai' }, 'Chưa có bảng nào.'));
      return null;
    }
    if (!duLieu.bang.some(function (b) { return b.tableCode === chon.bang; })) chon.bang = duLieu.bang[0].tableCode;
    var selBang = oChon(duLieu.bang.map(function (b) { return { giaTri: b.tableCode, nhan: b.tableName }; }), chon.bang);
    selBang.addEventListener('change', function () { chon.bang = selBang.value; veNoiDung(); });
    khung.appendChild(dong('Bảng', selBang));
    return duLieu.bang.filter(function (b) { return b.tableCode === chon.bang; })[0];
  }

  // ---------- Kỳ báo cáo ----------

  // GAS chạy mỗi lần tối đa ~4 phút rồi trả tiepTu → gọi tiếp tới khi xong,
  // cộng kết quả các lô. Gọi lại an toàn: tab kỳ đã có / đã khoá thì bỏ qua.
  function chayTheoLo(goiLo, nut, chuDangChay) {
    var tong = null;
    function lan(batDau) {
      nut.innerHTML = '<span class="spinner"></span>' + chuDangChay +
        (tong && tong.tong ? ' ' + batDau + '/' + tong.tong : '…');
      return goiLo(batDau).then(kiemPhien).then(function (res) {
        tong = KY_BAO_CAO.gopLo(tong, res);
        return res.tiepTu === null || res.tiepTu === undefined ? tong : lan(res.tiepTu);
      });
    }
    return lan(0);
  }

  /** Tạo kỳ có thể đã tạo file mới → tải lại dữ liệu ngầm (mục Phân quyền khoá ô "Đã có file"). */
  function taiLaiNgam() {
    API.qtLayDuLieu(token()).then(function (res) {
      if (res && res.ok) duLieu.giao = res.giao;
    });
  }

  function veKyBaoCao(khung) {
    var bang = chonBang(khung);
    if (!bang) return;

    var hangMoi = khung.appendChild(DOM.tao('div', { class: 'qt-dong' }));
    hangMoi.appendChild(DOM.tao('span', { class: 'qt-nhan' }, 'Kỳ mới'));
    var oMoi = hangMoi.appendChild(DOM.tao('div', { class: 'qt-ky-moi' }));
    var oNgay = oMoi.appendChild(DOM.tao('input', { type: 'date', class: 'form-control' }));
    var nutTao = oMoi.appendChild(DOM.tao('button', { type: 'button', class: 'btn-login-main qt-nut-luu' }, 'Tạo kỳ'));

    var ds = khung.appendChild(DOM.tao('div', { class: 'qt-ds-ky' }));
    var bao = khung.appendChild(DOM.tao('div'));
    var dangChay = false;

    function baoKetQua(chu, laLoi) {
      bao.innerHTML = '';
      bao.appendChild(thongBao(chu, laLoi));
    }

    function veDanhSach() {
      ds.innerHTML = '';
      KY_BAO_CAO.kyCuaBang(duLieu.ky, bang.tableCode).forEach(function (k) {
        var hang = ds.appendChild(DOM.tao('div', { class: 'qt-ky' }));
        hang.appendChild(DOM.tao('span', { class: 'qt-ky-ten' }, k.periodName));
        hang.appendChild(DOM.tao('span', { class: 'qt-ky-tt' + (k.locked ? ' khoa' : '') }, k.locked ? 'Đã khoá' : 'Đang mở'));
        var nut = hang.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, k.locked ? 'Mở khoá' : 'Khoá'));
        nut.addEventListener('click', function () { khoaMo(k, nut); });
      });
    }

    function khoaMo(k, nut) {
      if (dangChay) return;
      dangChay = true;
      nut.disabled = true;
      bao.innerHTML = '';
      chayTheoLo(function (batDau) {
        return API.qtKhoaKy(token(), bang.tableCode, k.periodName, !k.locked, batDau);
      }, nut, k.locked ? 'Đang mở khoá' : 'Đang khoá')
        .then(function (kq) {
          duLieu.ky = KY_BAO_CAO.datKy(duLieu.ky, bang.tableCode, k.periodName, kq.khoa);
          veDanhSach();
          baoKetQua(KY_BAO_CAO.tomTatKhoaKy(kq), kq.loi.length > 0);
        })
        .catch(function (err) {
          veDanhSach();
          baoKetQua(err.message, true);
        })
        .then(function () { dangChay = false; });
    }

    nutTao.addEventListener('click', function () {
      if (dangChay) return;
      if (!oNgay.value) { oNgay.focus(); return; }
      dangChay = true;
      nutTao.disabled = true;
      bao.innerHTML = '';
      chayTheoLo(function (batDau) {
        return API.qtTaoKy(token(), bang.tableCode, oNgay.value, batDau);
      }, nutTao, 'Đang tạo')
        .then(function (kq) {
          var cu = KY_BAO_CAO.kyCuaBang(duLieu.ky, bang.tableCode).filter(function (k) { return k.periodName === kq.tenKy; })[0];
          duLieu.ky = KY_BAO_CAO.datKy(duLieu.ky, bang.tableCode, kq.tenKy, cu ? cu.locked : false);
          if (kq.fileMoi) taiLaiNgam();
          oNgay.value = '';
          veDanhSach();
          baoKetQua(KY_BAO_CAO.tomTatTaoKy(kq), (kq.loi.length + ((kq.quyen && kq.quyen.loi.length) || 0)) > 0);
        })
        .catch(function (err) { baoKetQua(err.message, true); })
        .then(function () {
          dangChay = false;
          nutTao.disabled = false;
          nutTao.textContent = 'Tạo kỳ';
        });
    });

    veDanhSach();
  }

  // ---------- Phân quyền ----------

  function vePhanQuyen(khung) {
    var bangChon = chonBang(khung);
    if (!bangChon) return;

    // Đơn vị quản lý: nhiều dòng chọn, mỗi dòng có nút gỡ; mặc định theo lĩnh vực (không khoá)
    var hangQl = khung.appendChild(DOM.tao('div', { class: 'qt-dong qt-dong-tren' }));
    hangQl.appendChild(DOM.tao('span', { class: 'qt-nhan' }, 'Đơn vị quản lý'));
    var cotQl = hangQl.appendChild(DOM.tao('div', { class: 'qt-cot-quan-ly' }));
    var dsQl = cotQl.appendChild(DOM.tao('div', { class: 'qt-ds-quan-ly' }));
    function themQuanLy(ma) {
      var hang = dsQl.appendChild(DOM.tao('div', { class: 'qt-quan-ly' }));
      hang.appendChild(oChon([{ giaTri: '', nhan: '—' }].concat(luaChonDonVi()), ma || ''));
      var xoa = hang.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-xoa', title: 'Gỡ đơn vị quản lý này' }, '×'));
      xoa.addEventListener('click', function () { hang.remove(); });
      return hang;
    }
    PHAN_QUYEN.quanLyMacDinh(bangChon, duLieu.bang, duLieu.donVi).forEach(themQuanLy);
    var themQl = cotQl.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, '+ Thêm đơn vị quản lý'));
    themQl.addEventListener('click', function () { DOM.$('select', themQuanLy('')).focus(); });

    var giao = PHAN_QUYEN.giaoCuaBang(duLieu.giao, chon.bang);
    var tieuDe = khung.appendChild(DOM.tao('div', { class: 'qt-dong' }));
    tieuDe.appendChild(DOM.tao('span', { class: 'qt-nhan' }, 'Đơn vị được giao'));
    var hangLoc = tieuDe.appendChild(DOM.tao('div', { class: 'qt-hang-loc' }));
    var loc = hangLoc.appendChild(DOM.tao('input', { type: 'search', class: 'form-control', placeholder: 'Lọc đơn vị…' }));
    var nutChon = hangLoc.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Chọn tất cả'));
    var nutBo = hangLoc.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Bỏ chọn tất cả'));

    var luoi = khung.appendChild(DOM.tao('div', { class: 'qt-luoi-don-vi' }));
    // Chỉ đụng đơn vị đang hiện (theo ô lọc); ô "Đã có file" khoá, không đổi
    function chonHet(chon) {
      DOM.$$('.qt-o-don-vi:not(.an) input:not(:disabled)', luoi).forEach(function (o) { o.checked = chon; });
    }
    nutChon.addEventListener('click', function () { chonHet(true); });
    nutBo.addEventListener('click', function () { chonHet(false); });
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
      var ql = DOM.$$('select', dsQl).map(function (s) { return s.value; })
        .filter(function (m, i, ds) { return m && ds.indexOf(m) === i; });
      return API.qtLuuPhanQuyen(token(), chon.bang, ql, dsDv).then(function (res) {
        if (res && res.ok) { res.dsDv = dsDv; res.ql = ql; }
        return res;
      });
    }, function (res) {
      bangChon.managerUnits = res.ql;
      duLieu.giao = PHAN_QUYEN.thayGiao(duLieu.giao, chon.bang, res.dsDv);
    });
  }

  return { khoiTao: khoiTao };
})();
