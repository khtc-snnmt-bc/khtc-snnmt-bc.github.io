// ============================================================
// bcsnn · js/domains/ky-bao-cao.js
// Vai trò  : URL iframe, file của bảng ở sidebar; danh sách kỳ, ngày tự khoá gợi ý,
//            câu báo tạo/khoá/xoá kỳ (trang quản trị)
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phiên bản: 0.6.0 · Cập nhật: 08/10/2026 17:20
// ============================================================

var KY_BAO_CAO = (function () {
  'use strict';

  /**
   * Tạo URL mở file Google Sheet với tham số authuser.
   * @param {string} fileId
   * @param {string} [gmail]
   * @returns {string}
   */
  function taoUrlSheet(fileId, gmail) {
    if (!fileId) return '';
    var base = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(fileId) + '/edit';
    return gmail ? base + '?authuser=' + encodeURIComponent(gmail) : base;
  }

  /**
   * Các file xem được của một bảng ở sidebar: bảng thường → file của mình;
   * bảng mình quản lý → Bảng tổng (nếu có) rồi từng đơn vị.
   * @returns {Array<{fileId: string, nhan: string}>}
   */
  function dsFileBang(bang) {
    if (!bang.donVi) return bang.fileId ? [{ fileId: bang.fileId, nhan: bang.tableName || bang.tableCode }] : [];
    var ds = bang.fileId ? [{ fileId: bang.fileId, nhan: 'Bảng tổng' }] : [];
    return ds.concat(bang.donVi.map(function (d) { return { fileId: d.fileId, nhan: d.unitName || d.unitCode }; }));
  }

  /** 'dd.mm.yyyy' → số yyyymmdd để xếp; sai dạng → 0. */
  function soNgayKy(ten) {
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(ten || ''));
    return m ? Number(m[3] + m[2] + m[1]) : 0;
  }

  /** Kỳ của một bảng, mới nhất lên đầu. */
  function kyCuaBang(dsKy, tableCode) {
    return (dsKy || []).filter(function (k) { return k.tableCode === tableCode; })
      .sort(function (a, b) { return soNgayKy(b.periodName) - soNgayKy(a.periodName); });
  }

  /**
   * Ghi trạng thái một kỳ vào danh sách (thêm nếu chưa có) — trả mảng mới.
   * lockDate ('dd.mm.yyyy' | '') bỏ trống tham số thì giữ ngày tự khoá cũ.
   */
  function datKy(dsKy, tableCode, tenKy, locked, lockDate) {
    var co = false;
    var kq = (dsKy || []).map(function (k) {
      if (k.tableCode !== tableCode || k.periodName !== tenKy) return k;
      co = true;
      return { tableCode: tableCode, periodName: tenKy, locked: locked,
        lockDate: lockDate === undefined ? k.lockDate || '' : lockDate };
    });
    return co ? kq : kq.concat([{ tableCode: tableCode, periodName: tenKy, locked: locked, lockDate: lockDate || '' }]);
  }

  /** Danh sách kỳ sau khi xoá một kỳ của bảng. */
  function boKy(dsKy, tableCode, tenKy) {
    return (dsKy || []).filter(function (k) { return k.tableCode !== tableCode || k.periodName !== tenKy; });
  }

  /** 'dd.mm.yyyy' → 'yyyy-mm-dd' (giá trị ô chọn ngày); sai dạng → ''. */
  function ngayChoO(ten) {
    var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(ten || ''));
    return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
  }

  /**
   * Ngày tự khoá gợi ý cho kỳ mới: ngày lockDay (1–31) đầu tiên SAU ngày kỳ, tháng thiếu
   * ngày đó thì lấy cuối tháng — giống GAS hanKhoaMacDinh_. Vào/ra dạng 'yyyy-mm-dd'.
   */
  function hanKhoaGoiY(ngayKy, lockDay) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ngayKy || '')), n = Number(lockDay);
    if (!m || !(n >= 1 && n <= 31)) return '';
    var ky = new Date(+m[1], +m[2] - 1, +m[3]);
    for (var i = 0; ; i++) {
      var ngay = new Date(ky.getFullYear(), ky.getMonth() + i, Math.min(n, new Date(ky.getFullYear(), ky.getMonth() + i + 1, 0).getDate()));
      if (ngay > ky) {
        var hai = function (x) { return (x < 10 ? '0' : '') + x; };
        return ngay.getFullYear() + '-' + hai(ngay.getMonth() + 1) + '-' + hai(ngay.getDate());
      }
    }
  }

  /** Cộng kết quả các lô GAS trả về (tạo / khoá kỳ chạy nhiều lần nối tiếp). */
  function gopLo(tong, lo) {
    if (!tong) return lo;
    var kq = Object.assign({}, lo);
    ['daTao', 'fileMoi', 'daCo', 'daLam', 'khongCoTab', 'capNhat', 'dongThem', 'daXoa', 'fileBo'].forEach(function (k) {
      if (k in lo) kq[k] = (tong[k] || 0) + lo[k];
    });
    kq.loi = (tong.loi || []).concat(lo.loi || []);
    if (tong.quyen || lo.quyen) {
      kq.quyen = { loi: ((tong.quyen && tong.quyen.loi) || []).concat((lo.quyen && lo.quyen.loi) || []) };
    }
    return kq;
  }

  /** Câu báo sau khi tạo kỳ. */
  function tomTatTaoKy(kq) {
    if (!kq.tong) return 'Đã ghi kỳ ' + kq.tenKy + '. Bảng chưa giao cho đơn vị nào.';
    var chu = 'Đã tạo kỳ ' + kq.tenKy + ' cho ' + (kq.daTao + kq.daCo) + '/' + kq.tong + ' đơn vị';
    if (kq.fileMoi) chu += ' (tạo mới ' + kq.fileMoi + ' file)';
    if (kq.dongThem) chu += ', thêm ' + kq.dongThem + ' dòng mới từ bảng tổng';
    return chu + '.' + phanLoi(kq);
  }

  /** Câu báo sau khi khoá / mở khoá kỳ. */
  function tomTatKhoaKy(kq) {
    var chu = (kq.khoa ? 'Đã khoá' : 'Đã mở khoá') + ' kỳ ' + kq.tenKy + ' ở ' + kq.daLam + '/' + kq.tong + ' file.';
    if (kq.khongCoTab) chu += ' ' + kq.khongCoTab + ' file chưa có tab kỳ này.';
    return chu + phanLoi(kq);
  }

  /** Câu báo sau khi xoá kỳ. */
  function tomTatXoaKy(kq) {
    var chu = kq.conSo
      ? 'Đã xoá kỳ ' + kq.tenKy + ' ở ' + kq.daXoa + ' file; còn file lỗi nên kỳ chưa xoá khỏi danh sách — bấm Xoá lại.'
      : 'Đã xoá kỳ ' + kq.tenKy + ' ở ' + kq.daXoa + ' file đơn vị và file tổng.';
    if (kq.fileBo) chu += ' ' + kq.fileBo + ' file không còn kỳ nào đã vào thùng rác Google Drive.';
    return chu + phanLoi(kq);
  }

  function phanLoi(kq) {
    var loi = (kq.loi || []).concat((kq.quyen && kq.quyen.loi) || []);
    return loi.length ? ' Lỗi: ' + loi.join(' · ') : '';
  }

  return {
    taoUrlSheet: taoUrlSheet, dsFileBang: dsFileBang,
    kyCuaBang: kyCuaBang, datKy: datKy, boKy: boKy, ngayChoO: ngayChoO, hanKhoaGoiY: hanKhoaGoiY, gopLo: gopLo,
    tomTatTaoKy: tomTatTaoKy, tomTatKhoaKy: tomTatKhoaKy, tomTatXoaKy: tomTatXoaKy
  };
})();
