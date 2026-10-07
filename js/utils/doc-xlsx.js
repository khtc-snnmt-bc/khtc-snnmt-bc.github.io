// ============================================================
// bcsnn · js/utils/doc-xlsx.js
// Vai trò  : Đọc chữ vài dòng đầu tab đầu của file .xlsx ngay trên trình duyệt
//            (không thư viện: tự đọc mục lục zip + DecompressionStream, DOMParser)
// Lớp      : utils — được gọi bởi: pages · được phép gọi: (không ai)
// Phiên bản: 0.1.0 · Cập nhật: 07/10/2026 23:55
// ============================================================
// Chỉ đọc giá trị đã lưu trong file (chữ, số, kết quả công thức Excel đã tính) —
// đủ để lấy tên bảng / dòng "Mã đơn vị" trước khi gửi file lên GAS.

var DOC_XLSX = (function () {
  'use strict';

  /** Mục lục zip → { 'xl/workbook.xml': {phuongPhap, viTri, coNen} } */
  function mucLucZip(buf) {
    var v = new DataView(buf), cuoi = -1;
    for (var i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
      if (v.getUint32(i, true) === 0x06054b50) { cuoi = i; break; }
    }
    if (cuoi < 0) throw new Error('không phải file .xlsx');
    var so = v.getUint16(cuoi + 10, true), p = v.getUint32(cuoi + 16, true), ds = {};
    var giaiMa = new TextDecoder();
    for (var k = 0; k < so; k++) {
      var dai = v.getUint16(p + 28, true);
      ds[giaiMa.decode(new Uint8Array(buf, p + 46, dai))] = {
        phuongPhap: v.getUint16(p + 10, true), coNen: v.getUint32(p + 20, true), viTri: v.getUint32(p + 42, true)
      };
      p += 46 + dai + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
    return ds;
  }

  /** Lấy một file trong zip thành chữ ('' nếu không có). */
  function docTrongZip(buf, ds, ten) {
    var m = ds[ten];
    if (!m) return Promise.resolve('');
    var v = new DataView(buf);
    var dau = m.viTri + 30 + v.getUint16(m.viTri + 26, true) + v.getUint16(m.viTri + 28, true);
    var du = new Uint8Array(buf, dau, m.coNen);
    if (m.phuongPhap === 0) return Promise.resolve(new TextDecoder().decode(du));
    var luong = new Blob([du]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(luong).text();
  }

  function xml(chu) {
    return new DOMParser().parseFromString(chu, 'application/xml');
  }

  function chuCuaNut(nut) {
    return Array.prototype.map.call(nut.getElementsByTagName('t'), function (t) { return t.textContent; }).join('');
  }

  // 'AB12' → 28 (số cột từ 1)
  function soCot(oA1) {
    var chu = /^[A-Z]+/.exec(oA1 || '');
    return chu ? chu[0].split('').reduce(function (s, c) { return s * 26 + c.charCodeAt(0) - 64; }, 0) : 0;
  }

  /**
   * Đọc soDong dòng đầu của tab đầu tiên → Promise<string[][]> (dòng[0] = dòng 1 của
   * Excel, ô[0] = cột A; ô trống = '').
   */
  function docDongDau(file, soDong) {
    return file.arrayBuffer().then(function (buf) {
      var ds = mucLucZip(buf);
      return Promise.all([
        docTrongZip(buf, ds, 'xl/workbook.xml'), docTrongZip(buf, ds, 'xl/_rels/workbook.xml.rels'),
        docTrongZip(buf, ds, 'xl/sharedStrings.xml')
      ]).then(function (ba) {
        var tab = xml(ba[0]).getElementsByTagName('sheet')[0];
        if (!tab) throw new Error('file không có tab nào');
        var maTab = tab.getAttribute('r:id') || tab.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        var lienKet = Array.prototype.filter.call(xml(ba[1]).getElementsByTagName('Relationship'), function (r) {
          return r.getAttribute('Id') === maTab;
        })[0];
        var dich = lienKet ? lienKet.getAttribute('Target') : 'worksheets/sheet1.xml';
        var duongDan = dich.charAt(0) === '/' ? dich.slice(1) : 'xl/' + dich;
        var chung = ba[2] ? Array.prototype.map.call(xml(ba[2]).getElementsByTagName('si'), chuCuaNut) : [];
        return docTrongZip(buf, ds, duongDan).then(function (chuTab) {
          var dong = [];
          for (var d = 0; d < soDong; d++) dong.push([]);
          Array.prototype.forEach.call(xml(chuTab).getElementsByTagName('row'), function (r) {
            var soD = Number(r.getAttribute('r'));
            if (!(soD >= 1 && soD <= soDong)) return;
            Array.prototype.forEach.call(r.getElementsByTagName('c'), function (c) {
              var cot = soCot(c.getAttribute('r')), kieu = c.getAttribute('t'), vNut = c.getElementsByTagName('v')[0];
              var gt = kieu === 'inlineStr' ? chuCuaNut(c) : vNut ? vNut.textContent : '';
              if (kieu === 's') gt = chung[Number(gt)] || '';
              if (cot) dong[soD - 1][cot - 1] = gt;
            });
          });
          return dong.map(function (o) { return Array.from(o, function (x) { return x === undefined ? '' : String(x); }); });
        });
      });
    });
  }

  return { docDongDau: docDongDau };
})();
