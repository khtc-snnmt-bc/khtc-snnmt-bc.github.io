// ============================================================
// bcsnn · js/pages/quan-tri.js
// Vai trò  : Trang quản trị (pptx trang 4): mật khẩu quản trị, menu Quản lý,
//            mục Kỳ báo cáo (tạo kỳ, khoá/mở khoá), Tài khoản (Gmail theo đơn vị),
//            Phân quyền (giao bảng, đơn vị quản lý), Quản lý bảng (tab Các bảng: chỉnh
//            sửa, tạo bảng cho đơn vị, xoá · tab Tạo bảng mới: dựng mẫu / tải Excel)
// Lớp      : pages — được gọi bởi: quantri.html · được phép gọi: domains, services, utils, config
// Phiên bản: 0.10.0 · Cập nhật: 07/10/2026 12:55
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
  var chon = { bang: '', bangQl: '', tabBang: 'ds', viecBang: 'sua' };
  var ketQuaBang = null;      // { tableCode, chu, kiem } — báo ngay sau khi tạo / lưu bảng

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
        duLieu = { donVi: PHAN_QUYEN.xepDonVi(res.donVi), taiKhoan: res.taiKhoan, bang: res.bang, giao: res.giao,
          ky: res.ky || [], linhVuc: res.linhVuc || [] };
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
    var ve = { 'ky': veKyBaoCao, 'tai-khoan': veTaiKhoan, 'phan-quyen': vePhanQuyen, 'bang': veQuanLyBang }[mucDangChon.ma];
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
    var hangLoc = khung.appendChild(DOM.tao('div', { class: 'qt-hang-loc qt-hang-loc-dv' }));
    var loc = hangLoc.appendChild(DOM.tao('input', { type: 'search', class: 'form-control qt-loc', placeholder: 'Lọc đơn vị…' }));
    var nutMo = hangLoc.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, '+ Thêm đơn vị'));
    var formMoi = khung.appendChild(veThemDonVi(function () { DOM.an(formMoi); }));
    DOM.an(formMoi);
    nutMo.addEventListener('click', function () {
      DOM.batTat(formMoi, 'an', !formMoi.classList.contains('an'));
      if (!formMoi.classList.contains('an')) DOM.$('input', formMoi).focus();
    });
    var luoi = khung.appendChild(DOM.tao('div', { class: 'qt-luoi-khoi' }));
    duLieu.donVi.forEach(function (d) { luoi.appendChild(veKhoiTaiKhoan(d)); });
    loc.addEventListener('input', function () {
      var hien = PHAN_QUYEN.locDonVi(duLieu.donVi, loc.value).map(function (d) { return d.unitCode; });
      DOM.$$('.qt-khoi', luoi).forEach(function (el) {
        DOM.batTat(el, 'an', hien.indexOf(el.getAttribute('data-ma')) < 0);
      });
    });
  }

  /** Form thêm đơn vị: tên, mã, khu vực (gợi ý khu vực đã có), vai trò. Thành công → thêm vào danh sách, vẽ lại. */
  function veThemDonVi(dong_) {
    var form = DOM.tao('div', { class: 'qt-them-don-vi' });
    var oTen = form.appendChild(DOM.tao('input', { type: 'text', class: 'form-control', placeholder: 'Tên đơn vị' }));
    var oMa = form.appendChild(DOM.tao('input', { type: 'text', class: 'form-control', placeholder: 'Mã (không dấu)', maxlength: '40' }));
    var oKv = form.appendChild(DOM.tao('input', { type: 'text', class: 'form-control', placeholder: 'Khu vực', list: 'qt-ds-khu-vuc' }));
    var dsKv = form.appendChild(DOM.tao('datalist', { id: 'qt-ds-khu-vuc' }));
    duLieu.donVi.map(function (d) { return d.region; }).filter(function (k, i, ds) { return k && ds.indexOf(k) === i; })
      .forEach(function (k) { dsKv.appendChild(DOM.tao('option', { value: k })); });
    var selVt = form.appendChild(oChon(PHAN_QUYEN.VAI_TRO_DON_VI.map(function (v) { return { giaTri: v, nhan: v }; }), PHAN_QUYEN.VAI_TRO_DON_VI[0]));
    var nut = form.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Thêm'));
    var bao = form.appendChild(DOM.tao('div', { class: 'qt-them-don-vi-bao' }));

    var maTuSua = false;
    oTen.addEventListener('input', function () { if (!maTuSua) oMa.value = PHAN_QUYEN.maDonViTuTen(oTen.value); });
    oMa.addEventListener('input', function () { maTuSua = !!oMa.value; });
    nut.addEventListener('click', function () {
      chayNut(nut, 'Đang thêm…', function () {
        return API.qtThemDonVi(token(), oMa.value.trim(), oTen.value.trim(), oKv.value.trim(), selVt.value);
      }, function (res) {
        duLieu.donVi = PHAN_QUYEN.xepDonVi(duLieu.donVi.concat([res.moi]));
        dong_();
        veNoiDung();
        var baoMoi = DOM.$('.qt-khung', elNoiDung).insertBefore(thongBao('Đã thêm đơn vị ' + res.moi.unitName + ' (' + res.moi.unitCode + ').' +
          (res.loiCapNhatMau && res.loiCapNhatMau.length ? ' Chưa cập nhật danh sách chọn mã ở file mẫu: ' + res.loiCapNhatMau[0] : ''),
          !!(res.loiCapNhatMau && res.loiCapNhatMau.length)), DOM.$('.qt-hang-loc', elNoiDung).nextSibling);
      }, bao);
    });
    return form;
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

  // ---------- Quản lý bảng ----------

  function oNhap(giaTri, thuocTinh) {
    var o = DOM.tao('input', Object.assign({ type: 'text', class: 'form-control' }, thuocTinh || {}));
    o.value = giaTri === undefined || giaTri === null ? '' : String(giaTri);
    return o;
  }

  function oTich(bat) {
    var nhan = DOM.tao('span', { class: 'qt-tich' });
    var o = nhan.appendChild(DOM.tao('input', { type: 'checkbox' }));
    o.checked = !!bat;
    return { o: o, el: nhan };
  }

  /** Như dong() nhưng không phải <label> — hàng có nút bên trong (bấm nhãn không kích nút). */
  function hang(nhan, phanTu) {
    var d = DOM.tao('div', { class: 'qt-dong' });
    d.appendChild(DOM.tao('span', { class: 'qt-nhan' }, nhan));
    d.appendChild(phanTu);
    return d;
  }

  // Lĩnh vực: chỉ chọn trong danh mục (tránh gõ tràn lan); "+ Thêm lĩnh vực" mở ô tên + mã
  function oLinhVuc(giaTri) {
    var boc = DOM.tao('div', { class: 'qt-linh-vuc' });
    var hangChon = boc.appendChild(DOM.tao('div', { class: 'qt-hang-loc' }));
    var sel = hangChon.appendChild(DOM.tao('select', { class: 'form-control' }));
    var nutMo = hangChon.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, '+ Thêm lĩnh vực'));
    var form = boc.appendChild(DOM.tao('div', { class: 'qt-them-linh-vuc an' }));
    var oTen = form.appendChild(oNhap('', { placeholder: 'Tên lĩnh vực' }));
    var oMa = form.appendChild(oNhap('', { placeholder: 'Mã', maxlength: '15' }));
    var nutThem = form.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Thêm'));
    var bao = boc.appendChild(DOM.tao('div'));

    function veLuaChon(chonMa) {
      sel.innerHTML = '';
      [{ giaTri: '', nhan: '— Chọn lĩnh vực —' }].concat(QUAN_LY_BANG.luaChonLinhVuc(duLieu.linhVuc)).forEach(function (lc) {
        var op = sel.appendChild(DOM.tao('option', { value: lc.giaTri }, lc.nhan));
        if (lc.giaTri === chonMa) op.selected = true;
      });
    }
    veLuaChon(giaTri || '');

    var maTuSua = false;
    oTen.addEventListener('input', function () { if (!maTuSua) oMa.value = QUAN_LY_BANG.maLinhVucTuTen(oTen.value); });
    oMa.addEventListener('input', function () { maTuSua = !!oMa.value; });
    nutMo.addEventListener('click', function () {
      DOM.batTat(form, 'an', !form.classList.contains('an'));
      if (!form.classList.contains('an')) oTen.focus();
    });
    nutThem.addEventListener('click', function () {
      chayNut(nutThem, 'Đang thêm…', function () {
        return API.qtThemLinhVuc(token(), oMa.value.trim(), oTen.value.trim());
      }, function (res) {
        duLieu.linhVuc = res.linhVuc;
        veLuaChon(res.moi.groupCode);
        oTen.value = oMa.value = '';
        maTuSua = false;
        DOM.an(form);
      }, bao);
    });
    return { o: sel, el: boc };
  }

  /**
   * Lĩnh vực · Cách tổng hợp · Cách nhập dòng · Cho thêm dòng (chung bảng mới / bảng đã có).
   * Bảng tổng các đơn vị: luôn Sở giao dòng, đơn vị không thêm dòng (chủ dự án chốt 07/10/2026).
   */
  function vePhanLoai(khung, cd, khiDoiCach) {
    var linhVuc = oLinhVuc(cd.group);
    var selTong = oChon(QUAN_LY_BANG.CACH_TONG_HOP.map(function (c) { return { giaTri: c.ma, nhan: c.ten }; }), cd.aggregateType || 'ghep');
    var selCach = oCachNhapDong(cd.sourceType);
    var them = oTich(cd.allowAddRows);
    khung.appendChild(hang('Lĩnh vực', linhVuc.el)).classList.add('qt-dong-tren');
    khung.appendChild(dong('Cách tổng hợp', selTong));
    khung.appendChild(dong('Cách nhập dòng', selCach));
    var hangThem = dong('Cho thêm dòng', them.el);
    function apLuat() {
      var laTong = selTong.value === 'tong';
      if (laTong) { selCach.value = 'gopTach'; them.o.checked = false; }
      selCach.disabled = laTong;
      them.o.disabled = laTong;
      khiDoiCach(selCach.value);
    }
    selTong.addEventListener('change', apLuat);
    selCach.addEventListener('change', function () { khiDoiCach(selCach.value); });
    return {
      hangThem: hangThem, apLuat: apLuat,
      giaTri: function () {
        return { group: linhVuc.o.value, aggregateType: selTong.value, sourceType: selCach.value, allowAddRows: them.o.checked };
      }
    };
  }

  function veKiem(noi, kiem) {
    noi.innerHTML = '';
    var tt = QUAN_LY_BANG.tomTatKiem(kiem);
    if (tt.hopLe) { noi.appendChild(thongBao('Mẫu hợp lệ.')); return; }
    var bao = noi.appendChild(DOM.tao('div', { class: 'alert alert-error' }));
    bao.appendChild(DOM.tao('div', {}, 'Mẫu chưa đúng ' + tt.dong.length + ' chỗ:'));
    var ul = bao.appendChild(DOM.tao('ul', { class: 'qt-ds-loi' }));
    tt.dong.forEach(function (d) { ul.appendChild(DOM.tao('li', {}, d)); });
  }

  /** Bấm nút → chờ GAS (nút quay), lỗi báo vào `bao`. */
  function chayNut(nut, chuCho, goi, xong, bao) {
    var chuCu = nut.textContent;
    nut.disabled = true;
    nut.innerHTML = '<span class="spinner"></span>' + chuCho;
    bao.innerHTML = '';
    goi().then(kiemPhien).then(xong)
      .catch(function (err) { bao.appendChild(thongBao(err.message, true)); })
      .then(function () {
        nut.disabled = false;
        nut.textContent = chuCu;
      });
  }

  // Hai tab: Các bảng (danh sách → Chỉnh sửa / Tạo bảng cho đơn vị / Xoá) · Tạo bảng mới
  var TAB_BANG = [{ ma: 'ds', ten: 'Các bảng' }, { ma: 'moi', ten: 'Tạo bảng mới' }];

  function veQuanLyBang(khung) {
    var thanh = khung.appendChild(DOM.tao('div', { class: 'qt-tab-bar', role: 'tablist' }));
    TAB_BANG.forEach(function (t) {
      var nut = thanh.appendChild(DOM.tao('button', { type: 'button', role: 'tab',
        class: 'qt-tab' + (chon.tabBang === t.ma ? ' active' : '') }, t.ten));
      nut.addEventListener('click', function () {
        chon.tabBang = t.ma;
        chon.bangQl = '';
        ketQuaBang = null;
        veNoiDung();
      });
    });
    if (chon.tabBang === 'moi') { veBangMoi(khung); return; }
    var bang = duLieu.bang.filter(function (b) { return b.tableCode === chon.bangQl; })[0];
    if (!bang) { veDsBang(khung); return; }

    var dau = khung.appendChild(DOM.tao('div', { class: 'qt-chi-tiet-dau' }));
    var lui = dau.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, '← Các bảng'));
    dau.appendChild(DOM.tao('span', { class: 'qt-chi-tiet-ten' }, bang.tableName));
    lui.addEventListener('click', function () { chon.bangQl = ''; ketQuaBang = null; veNoiDung(); });
    if (chon.viecBang === 'tao') veTaoBangNhap(khung, bang);
    else veCaiDatBang(khung, bang);
  }

  function veDsBang(khung) {
    if (!duLieu.bang.length) {
      khung.appendChild(DOM.tao('p', { class: 'qt-dang-tai' }, 'Chưa có bảng nào.'));
      return;
    }
    var ds = khung.appendChild(DOM.tao('div', { class: 'qt-ds-bang' }));
    var bao = khung.appendChild(DOM.tao('div'));
    duLieu.bang.forEach(function (b) {
      var h = ds.appendChild(DOM.tao('div', { class: 'qt-bang' }));
      var ten = h.appendChild(DOM.tao('div', { class: 'qt-bang-ten' }));
      ten.appendChild(DOM.tao('span', {}, b.tableName));
      ten.appendChild(DOM.tao('small', {}, QUAN_LY_BANG.tenLinhVuc(duLieu.linhVuc, b.group) + ' · ' + b.tableCode));
      h.appendChild(DOM.tao('span', { class: 'qt-bang-so' }, QUAN_LY_BANG.soDonViCoFile(duLieu.giao, b.tableCode) + ' đơn vị'));
      var nutSua = h.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Chỉnh sửa'));
      var nutTao = h.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Tạo bảng cho đơn vị'));
      var nutXoa = h.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them qt-nut-do' }, 'Xoá'));
      function mo(viec) { chon.bangQl = b.tableCode; chon.viecBang = viec; ketQuaBang = null; veNoiDung(); }
      nutSua.addEventListener('click', function () { mo('sua'); });
      nutTao.addEventListener('click', function () { mo('tao'); });
      nutXoa.addEventListener('click', function () { xoaBang(b, nutXoa, bao); });
    });
  }

  function xoaBang(b, nut, bao) {
    var soFile = QUAN_LY_BANG.soDonViCoFile(duLieu.giao, b.tableCode);
    if (!window.confirm('Xoá bảng "' + b.tableName + '"?\n\nFile tổng' + (soFile ? ' và ' + soFile + ' file của các đơn vị' : '') +
      ' sẽ vào thùng rác Google Drive (khôi phục được trong 30 ngày). Đơn vị không còn thấy bảng này.')) return;
    chayNut(nut, 'Đang xoá…', function () { return API.qtXoaBang(token(), b.tableCode); }, function () {
      duLieu.bang = duLieu.bang.filter(function (x) { return x.tableCode !== b.tableCode; });
      duLieu.giao = duLieu.giao.filter(function (g) { return g.tableCode !== b.tableCode; });
      duLieu.ky = (duLieu.ky || []).filter(function (k) { return k.tableCode !== b.tableCode; });
      veNoiDung();
    }, bao);
  }

  function oCachNhapDong(giaTri) {
    return oChon(QUAN_LY_BANG.CACH_NHAP_DONG.map(function (c) { return { giaTri: c.ma, nhan: c.ten }; }), giaTri || 'docLap');
  }

  // Bảng đã có: sửa cài đặt (thiết kế 5.1), mở / kiểm file tổng
  function veCaiDatBang(khung, bang) {
    var cd = bang.caiDat || {};
    var oTen = oNhap(bang.tableName);
    khung.appendChild(dong('Tên bảng', oTen));

    var hangFile = DOM.tao('div', { class: 'qt-file-tong' });
    if (cd.templateFileId) {
      hangFile.appendChild(DOM.tao('a', { class: 'qt-nut-them', href: KY_BAO_CAO.taoUrlSheet(cd.templateFileId),
        target: '_blank', rel: 'noopener' }, 'Mở file tổng ↗'));
    }
    var nutKiem = hangFile.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Kiểm tra bảng'));
    var khoiFile = DOM.tao('div', {});
    khoiFile.appendChild(hangFile);
    khoiFile.appendChild(DOM.tao('div', { class: 'qt-mo-ta' },
      'Kiểm tra file tổng: mã đơn vị ở cột A có trong danh mục; "Cột được nhập" ghi đúng dạng, không gồm cột A, không vượt quá cột cuối của bảng; ' +
      '"Dòng được nhập" và "Dòng khoá" nằm trong vùng dữ liệu; tab chú thích có thật; không ô công thức nào báo lỗi. ' +
      'Đồng thời đưa file tổng và file các đơn vị về thư mục của bảng.'));
    khung.appendChild(hang('File tổng', khoiFile));

    var oCot = oNhap(cd.inputCols, { placeholder: 'C:J, L' });
    var oDongNhap = oNhap(cd.inputRows, { placeholder: 'Mọi dòng' });
    var oDongKhoa = oNhap(cd.lockedRows);
    var oSoDong = oNhap(cd.dataRows, { type: 'number', min: '1', max: '500' });
    var oChuThich = oNhap(cd.noteTabs);
    var hangSoDong = dong('Số dòng sẵn', oSoDong);
    var phanLoai = vePhanLoai(khung, { group: bang.group, aggregateType: cd.aggregateType, sourceType: cd.sourceType,
      allowAddRows: cd.allowAddRows }, function (cach) { DOM.batTat(hangSoDong, 'an', cach !== 'docLap'); });
    khung.appendChild(dong('Cột được nhập', oCot));
    khung.appendChild(dong('Dòng được nhập', oDongNhap));
    khung.appendChild(dong('Dòng khoá', oDongKhoa));
    khung.appendChild(hangSoDong);
    khung.appendChild(phanLoai.hangThem);
    khung.appendChild(dong('Tab chú thích', oChuThich));
    phanLoai.apLuat();

    var hangNut = khung.appendChild(DOM.tao('div', { class: 'qt-hang-nut' }));
    var nut = hangNut.appendChild(DOM.tao('button', { type: 'button', class: 'btn-login-main qt-nut-luu' }, 'Lưu'));
    var bao = khung.appendChild(DOM.tao('div'));
    var noiKiem = khung.appendChild(DOM.tao('div'));
    if (ketQuaBang && ketQuaBang.tableCode === bang.tableCode) {
      bao.appendChild(thongBao(ketQuaBang.chu));
      veKiem(noiKiem, ketQuaBang.kiem);
    }
    ketQuaBang = null;

    nutKiem.addEventListener('click', function () {
      chayNut(nutKiem, 'Đang kiểm tra…', function () { return API.qtKiemMau(token(), bang.tableCode); },
        function (res) { veKiem(noiKiem, res.kiem); }, bao);
    });

    nut.addEventListener('click', function () {
      var caiDat = Object.assign(phanLoai.giaTri(), {
        tableName: oTen.value.trim(), inputCols: oCot.value.trim(), inputRows: oDongNhap.value.trim(),
        lockedRows: oDongKhoa.value.trim(), noteTabs: oChuThich.value.trim()
      });
      caiDat.dataRows = caiDat.sourceType === 'docLap' ? oSoDong.value.trim() : cd.dataRows;
      chayNut(nut, 'Đang lưu…', function () { return API.qtLuuBang(token(), bang.tableCode, caiDat); }, function (res) {
        bang.tableName = caiDat.tableName;
        bang.group = caiDat.group;
        bang.caiDat = res.caiDat;
        ketQuaBang = { tableCode: bang.tableCode, chu: 'Đã lưu.', kiem: res.kiem };
        veNoiDung();
      }, bao);
    });
  }

  // Giao theo mã ở cột A file tổng (bảng Sở giao dòng) → tạo bảng nhập liệu cho các đơn vị
  // được giao = tạo kỳ đầu (file + tab kỳ + chia quyền), dùng lại đúng việc Tạo kỳ.
  // Máy chủ kiểm mẫu trước — mẫu sai thì không tạo.
  function veTaoBangNhap(khung, bang) {
    var vung = khung.appendChild(DOM.tao('div'));
    var hangGiao = DOM.tao('div', { class: 'qt-file-tong' });
    var soGiao = hangGiao.appendChild(DOM.tao('span', { class: 'qt-so-giao' }));
    function demGiao() {
      soGiao.textContent = Object.keys(PHAN_QUYEN.giaoCuaBang(duLieu.giao, bang.tableCode)).length + ' đơn vị';
    }
    demGiao();
    if ((bang.caiDat || {}).sourceType === 'gopTach') {
      var nutGiao = hangGiao.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Giao theo mã trong bảng'));
      nutGiao.addEventListener('click', function () {
        chayNut(nutGiao, 'Đang giao…', function () { return API.qtGiaoTheoMau(token(), bang.tableCode); }, function (res) {
          duLieu.giao = res.giao;
          demGiao();
          var tt = QUAN_LY_BANG.tomTatGiaoTheoMau(res);
          bao.appendChild(thongBao(tt.chu, tt.laLoi));
        }, bao);
      });
    }
    vung.appendChild(hang('Đơn vị được giao', hangGiao));
    var o = DOM.tao('div', { class: 'qt-ky-moi' });
    var oNgay = o.appendChild(DOM.tao('input', { type: 'date', class: 'form-control' }));
    var nut = o.appendChild(DOM.tao('button', { type: 'button', class: 'btn-login-main qt-nut-luu' }, 'Tạo cho các đơn vị'));
    vung.appendChild(hang('Bảng nhập liệu', o));
    var bao = vung.appendChild(DOM.tao('div'));   // dùng chung cho Giao theo mã và Tạo

    nut.addEventListener('click', function () {
      bao.innerHTML = '';
      if (!Object.keys(PHAN_QUYEN.giaoCuaBang(duLieu.giao, bang.tableCode)).length) {
        bao.appendChild(thongBao('Bảng chưa giao cho đơn vị nào — vào mục Phân quyền để giao.', true));
        return;
      }
      if (!oNgay.value) { oNgay.focus(); return; }
      nut.disabled = true;
      chayTheoLo(function (batDau) {
        return API.qtTaoKy(token(), bang.tableCode, oNgay.value, batDau);
      }, nut, 'Đang tạo')
        .then(function (kq) {
          var cu = KY_BAO_CAO.kyCuaBang(duLieu.ky, bang.tableCode).filter(function (k) { return k.periodName === kq.tenKy; })[0];
          duLieu.ky = KY_BAO_CAO.datKy(duLieu.ky, bang.tableCode, kq.tenKy, cu ? cu.locked : false);
          if (kq.fileMoi) taiLaiNgam();
          bao.appendChild(thongBao(KY_BAO_CAO.tomTatTaoKy(kq), (kq.loi.length + ((kq.quyen && kq.quyen.loi.length) || 0)) > 0));
        })
        .catch(function (err) { bao.appendChild(thongBao(err.message, true)); })
        .then(function () {
          nut.disabled = false;
          nut.textContent = 'Tạo cho các đơn vị';
        });
    });
  }

  // Bảng mới: nút Tải Excel ngay dưới tab — chưa chọn file thì dựng mẫu trên app (thiết kế 5.1)
  function veBangMoi(khung) {
    var hangExcel = khung.appendChild(DOM.tao('div', { class: 'qt-tai-excel' }));
    var khoiCoSan = hangExcel.appendChild(DOM.tao('div', { class: 'qt-khoi-excel' }));
    var hangCoSan = khoiCoSan.appendChild(DOM.tao('div', { class: 'qt-file-tong' }));
    var oFile = hangCoSan.appendChild(DOM.tao('input', { type: 'file', accept: '.xlsx', class: 'an' }));
    var nutExcel = hangCoSan.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Tạo bảng từ file Excel có sẵn'));
    var tenFile = hangCoSan.appendChild(DOM.tao('span', { class: 'qt-ten-file an' }));
    var boFile = hangCoSan.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-xoa an', title: 'Bỏ file, dựng mẫu trên app' }, '×'));
    khoiCoSan.appendChild(DOM.tao('div', { class: 'qt-mo-ta' },
      'File .xlsx có tab đầu là bảng nhập: một ô cột A ghi đúng "Mã đơn vị" làm dòng tiêu đề cột, dữ liệu ở dưới. ' +
      'Bảng Sở giao dòng: cột A ghi mã đơn vị (hoặc all). Bảng đơn vị tự nhập dòng: cột A để trống. Công thức không báo lỗi. ' +
      'Sai chỗ nào, app chỉ rõ để sửa.'));

    var khoiMau = hangExcel.appendChild(DOM.tao('div', { class: 'qt-khoi-excel' }));
    var nutMau = khoiMau.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, 'Tải file Excel mẫu'));
    khoiMau.appendChild(DOM.tao('div', { class: 'qt-mo-ta' },
      'File có sẵn ô A2 "Mã đơn vị" và danh sách chọn mã đơn vị ở cột A (tab "Mã đơn vị" liệt kê all và mã các đơn vị). ' +
      'Tải về, kẻ bảng, nhập công thức, trình bày rồi tải lên bằng nút bên cạnh.'));
    var baoMau = khung.appendChild(DOM.tao('div'));
    nutMau.addEventListener('click', function () {
      chayNut(nutMau, 'Đang chuẩn bị…', function () { return API.qtMauExcel(token()); }, function (res) {
        var byte = atob(res.duLieu), mang = new Uint8Array(byte.length);
        for (var i = 0; i < byte.length; i++) mang[i] = byte.charCodeAt(i);
        var a = DOM.tao('a', { href: URL.createObjectURL(new Blob([mang], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })),
          download: res.tenFile });
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, baoMau);
    });

    var oTen = oNhap('');
    var oMa = oNhap('');
    khung.appendChild(dong('Tên bảng', oTen));
    khung.appendChild(dong('Mã bảng', oMa));
    var phanLoai = vePhanLoai(khung, { sourceType: 'docLap', aggregateType: 'ghep', allowAddRows: false }, function () {});
    khung.appendChild(phanLoai.hangThem);
    phanLoai.apLuat();

    // Mã bảng tự theo tên tới khi quản trị tự sửa mã
    var maTuSua = false;
    oTen.addEventListener('input', function () { if (!maTuSua) oMa.value = QUAN_LY_BANG.maTuTen(oTen.value); });
    oMa.addEventListener('input', function () { maTuSua = !!oMa.value; });

    var vungDung = khung.appendChild(DOM.tao('div'));
    var vungExcel = khung.appendChild(DOM.tao('div', { class: 'an' }));
    function doiMau() {
      var file = oFile.files[0];
      tenFile.textContent = file ? file.name : '';
      [tenFile, boFile].forEach(function (el) { DOM.batTat(el, 'an', !file); });
      DOM.batTat(vungDung, 'an', !!file);
      DOM.batTat(vungExcel, 'an', !file);
    }
    nutExcel.addEventListener('click', function () { oFile.click(); });
    oFile.addEventListener('change', doiMau);
    boFile.addEventListener('click', function () { oFile.value = ''; doiMau(); });
    var chung = { oTen: oTen, oMa: oMa, phanLoai: phanLoai, layFile: function () { return oFile.files[0]; } };
    veDungMau(vungDung, chung);
    veTaiExcel(vungExcel, chung);
  }

  /** Tạo xong → về tab Các bảng, mở phần chỉnh sửa bảng mới kèm kết quả kiểm mẫu. */
  function moBangVuaTao(bang, chu, kiem) {
    duLieu.bang.push(bang);
    chon.tabBang = 'ds';
    chon.bangQl = bang.tableCode;
    chon.viecBang = 'sua';
    ketQuaBang = { tableCode: bang.tableCode, chu: chu, kiem: kiem };
    veNoiDung();
  }

  // Bảng mới từ Excel: tab đầu là bảng nhập; GAS chuyển thành Sheet rồi Kiểm mẫu — sai thì không giữ
  function veTaiExcel(khung, chung) {
    var oCot = oNhap('', { placeholder: 'C:J, L' });
    var oDongNhap = oNhap('', { placeholder: 'Mọi dòng' });
    var oDongKhoa = oNhap('');
    var oChuThich = oNhap('');
    khung.appendChild(dong('Cột được nhập', oCot));
    khung.appendChild(dong('Dòng được nhập', oDongNhap));
    khung.appendChild(dong('Dòng khoá', oDongKhoa));
    khung.appendChild(dong('Tab chú thích', oChuThich));
    var hangNut = khung.appendChild(DOM.tao('div', { class: 'qt-hang-nut' }));
    var nut = hangNut.appendChild(DOM.tao('button', { type: 'button', class: 'btn-login-main qt-nut-luu' }, 'Tải lên'));
    var bao = khung.appendChild(DOM.tao('div'));
    var noiKiem = khung.appendChild(DOM.tao('div'));

    nut.addEventListener('click', function () {
      var file = chung.layFile();
      if (!file) return;
      noiKiem.innerHTML = '';
      var maYeuCau = Date.now().toString(36) + Math.random().toString(36).slice(2);
      chayNut(nut, 'Đang tải lên…', function () {
        return API.docFileBase64(file).then(function (duLieu) {
          var khai = Object.assign(chung.phanLoai.giaTri(), {
            tableCode: chung.oMa.value.trim(), tableName: chung.oTen.value.trim(), inputCols: oCot.value.trim(),
            inputRows: oDongNhap.value.trim(), lockedRows: oDongKhoa.value.trim(), noteTabs: oChuThich.value.trim(),
            tenFile: file.name, duLieu: duLieu
          });
          return API.qtTaiMau(token(), khai, maYeuCau);
        });
      }, function (res) {
        if (!res.bang) { veKiem(noiKiem, res.kiem); return; }
        moBangVuaTao(res.bang, 'Đã tạo file tổng từ Excel.', res.kiem);
      }, bao);
    });
  }

  // Dựng mẫu trên app: khai cột → GAS dựng file tổng (dòng 1 tên bảng, dòng 2 tiêu đề, dữ liệu từ dòng 3)
  function veDungMau(khung, chung) {
    var oTen = chung.oTen, oMa = chung.oMa, phanLoai = chung.phanLoai;
    var oSoDong = oNhap('20', { type: 'number', min: '1', max: '500' });
    khung.appendChild(dong('Số dòng sẵn', oSoDong));

    var hangCot = khung.appendChild(DOM.tao('div', { class: 'qt-dong qt-dong-tren' }));
    hangCot.appendChild(DOM.tao('span', { class: 'qt-nhan' }, 'Cột'));
    var cotPhai = hangCot.appendChild(DOM.tao('div', { class: 'qt-cot-quan-ly' }));
    var dsCot = cotPhai.appendChild(DOM.tao('div', { class: 'qt-ds-cot' }));
    var cotA = dsCot.appendChild(DOM.tao('div', { class: 'qt-cot qt-cot-co-dinh' }));
    cotA.appendChild(DOM.tao('span', { class: 'qt-cot-chu' }, 'A'));
    cotA.appendChild(DOM.tao('span', { class: 'qt-cot-ten-co-dinh' }, 'Mã đơn vị'));

    function danhChu() {
      DOM.$$('.qt-cot:not(.qt-cot-co-dinh) .qt-cot-chu', dsCot).forEach(function (el, i) {
        el.textContent = QUAN_LY_BANG.chuCot(i + 2);
      });
    }

    function themCot() {
      var h = dsCot.appendChild(DOM.tao('div', { class: 'qt-cot' }));
      h.appendChild(DOM.tao('span', { class: 'qt-cot-chu' }));
      var ten = h.appendChild(oNhap('', { placeholder: 'Tên cột', 'data-truong': 'ten' }));
      var kieu = h.appendChild(oChon(QUAN_LY_BANG.KIEU_COT.map(function (k) { return { giaTri: k.ma, nhan: k.ten }; }), 'chu'));
      var phu = h.appendChild(oNhap('', { 'data-truong': 'phu' }));
      var xoa = h.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-xoa', title: 'Bỏ cột này' }, '×'));
      function doiKieu() {
        var p = QUAN_LY_BANG.oPhu(kieu.value);
        DOM.batTat(phu, 'qt-an-giu-cho', !p);
        phu.placeholder = p ? p.goiY : '';
        phu.title = p ? p.nhan : '';
      }
      kieu.addEventListener('change', doiKieu);
      doiKieu();
      xoa.addEventListener('click', function () { h.remove(); danhChu(); });
      danhChu();
      return ten;
    }
    themCot();
    var nutThemCot = cotPhai.appendChild(DOM.tao('button', { type: 'button', class: 'qt-nut-them' }, '+ Thêm cột'));
    nutThemCot.addEventListener('click', function () { themCot().focus(); });

    var hangNut = khung.appendChild(DOM.tao('div', { class: 'qt-hang-nut' }));
    var nut = hangNut.appendChild(DOM.tao('button', { type: 'button', class: 'btn-login-main qt-nut-luu' }, 'Tạo file tổng'));
    var bao = khung.appendChild(DOM.tao('div'));

    nut.addEventListener('click', function () {
      var khai = Object.assign(phanLoai.giaTri(), {
        tableCode: oMa.value.trim(), tableName: oTen.value.trim(), dataRows: oSoDong.value.trim(),
        cot: DOM.$$('.qt-cot:not(.qt-cot-co-dinh)', dsCot).map(function (h) {
          var kieu = DOM.$('select', h).value, phu = DOM.$('[data-truong="phu"]', h).value.trim();
          return { ten: DOM.$('[data-truong="ten"]', h).value.trim(), kieu: kieu,
            congThuc: kieu === 'congThuc' ? phu : '', luaChon: kieu === 'chon' ? phu : '' };
        })
      });
      var maYeuCau = Date.now().toString(36) + Math.random().toString(36).slice(2);
      chayNut(nut, 'Đang tạo…', function () { return API.qtTaoBang(token(), khai, maYeuCau); }, function (res) {
        moBangVuaTao(res.bang, 'Đã tạo file tổng.', res.kiem);
      }, bao);
    });
  }

  return { khoiTao: khoiTao };
})();
