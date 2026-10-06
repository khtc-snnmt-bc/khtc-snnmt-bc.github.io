// ============================================================
// bcsnn · gas/Code.js
// Vai trò  : Cửa vào web app GAS — doPost định tuyến theo action, luôn trả JSON
// Lớp      : gas — gọi: DangNhap.js, QuanTri.js, XacMinhGoogle.js
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 19:26
// ============================================================
// Nguồn GAS DUY NHẤT là thư mục app/gas/ (repo Public) → KHÔNG ghi ID file,
// Gmail, mật khẩu ở đây. ID Sheet quản lý nằm ở Script Properties (QUAN_LY_ID).
// Mã dựng dữ liệu thử (B04.js) nằm ngoài app/, đẩy kèm khi clasp push;
// có mặt trên máy chủ thì nhận các action b04_/b05_.

/** ID Sheet quản lý trong Script Properties (tên cũ B04_QUAN_LY vẫn đọc). */
function layQuanLyId_() {
  var p = PropertiesService.getScriptProperties();
  return p.getProperty('QUAN_LY_ID') || p.getProperty('B04_QUAN_LY');
}

function doPost(e) {
  var yc;
  try {
    yc = JSON.parse(e.postData.contents);
  } catch (err) {
    return traJson_({ ok: false, loi: 'Yêu cầu không đọc được' });
  }
  var action = String(yc.action || '');
  if (/^b0[45]_/.test(action) && typeof b04XuLy_ === 'function') return traJson_(b04XuLy_(yc));

  var id = layQuanLyId_();
  switch (action) {
    case 'layDonVi': return traJson_(xuLyLayDonVi_(id));
    case 'layTaiKhoan': return traJson_(xuLyLayTaiKhoan_(id, yc.unitCode));
    case 'timDonViTheoEmail': return traJson_(xuLyTimDonViTheoEmail_(id, yc.email));
    case 'dangNhap': return traJson_(xuLyDangNhap_(id, yc.email, yc.unitCode));
    case 'dangNhapGoogle': return traJson_(xuLyDangNhapGoogle_(id, yc.accessToken, yc.unitCode));
    case 'quanTriDangNhap': return traJson_(xuLyQuanTriDangNhap_(id, yc.email, yc.unitCode, yc.matKhau));
    case 'xacMinhGoogle': return traJson_(xuLyXacMinhGoogle_(yc.idToken));
    case 'quanTriKiemPhien': return traJson_(xuLyQuanTriKiemPhien_(yc.token));
    case 'quanTriDangXuat': return traJson_(xuLyQuanTriDangXuat_(yc.token));
  }
  return traJson_({ ok: false, loi: 'Không rõ action' });
}

function doGet() {
  return traJson_({ ok: true });
}

function traJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
