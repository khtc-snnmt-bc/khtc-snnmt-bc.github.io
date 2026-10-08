// ============================================================
// bcsnn · js/services/api.js
// Vai trò  : Gọi API GAS — file DUY NHẤT chạy fetch; xin mã Google (thư viện GIS)
// Lớp      : services — được gọi bởi: pages · được phép gọi: config
// Phiên bản: 0.15.0 · Cập nhật: 08/10/2026 22:33
// ============================================================
// GAS chuyển hướng 302 → fetch tự theo; Content-Type text/plain tránh
// preflight CORS. Lần gọi đầu ~3–10 s, sau đó ~2 s. Thỉnh thoảng GAS trả
// HTML thay vì JSON, hoặc chậm quá thời gian chờ → thử lại (so-tay/khoa-ky.md mục K3).

var API = (function () {
  'use strict';

  /**
   * Gửi POST tới GAS, trả Promise<object>.
   * @param {string} action — tên hành động GAS
   * @param {object} duLieu — dữ liệu kèm theo (ngoài action)
   * @param {number} [thoiGianCho] — ms; mặc định CAU_HINH.GAS_TIMEOUT
   * @returns {Promise<object>}
   */
  function goi(action, duLieu, thoiGianCho) {
    var cho = thoiGianCho || CAU_HINH.GAS_TIMEOUT || 15000;
    var url = CAU_HINH.layGasUrl();
    if (!url) return Promise.reject(new Error('Chưa cấu hình URL web app GAS. Vui lòng cài đặt URL GAS trước.'));

    var body = Object.assign({ action: action }, duLieu || {});
    var soLanThu = 0;
    var soLanMax = (CAU_HINH.GAS_THU_LAI || 0) + 1;

    function thuMot() {
      soLanThu++;
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, cho);

      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        signal: controller.signal
      })
        .then(function (res) {
          clearTimeout(timer);
          return res.text();
        })
        .then(function (text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            // GAS trả HTML (lỗi thoảng) → thử lại
            if (soLanThu < soLanMax) return thuMot();
            throw new Error('Máy chủ trả lời lỗi. Vui lòng thử lại.');
          }
        })
        .catch(function (err) {
          clearTimeout(timer);
          // Chậm quá thời gian chờ (Google "thức dậy" sau lúc nghỉ) cũng gọi lại;
          // việc ghi phía GAS đều gọi lại được (so-tay/khoa-ky.md mục K3)
          if (soLanThu < soLanMax) return thuMot();
          if (err.name === 'AbortError') throw new Error('Máy chủ phản hồi chậm. Vui lòng tải lại trang và thử lại.');
          throw err;
        });
    }

    return thuMot();
  }

  /**
   * Lấy danh sách các đơn vị để hiển thị cho người dùng chọn nhanh.
   * @returns {Promise<object>} { ok, donVi: [{ unitCode, unitName, region, role }] }
   */
  function layDanhSachDonVi() {
    return goi('layDonVi');
  }

  /**
   * Đăng nhập: gửi Gmail + mã đơn vị → GAS kiểm → trả danh sách bảng.
   * @param {string} email
   * @param {string} unitCode
   * @returns {Promise<object>} { ok, tables: [{tableCode, tableName, group, fileId}], unitName, role }
   */
  function dangNhap(email, unitCode) {
    return goi('dangNhap', { email: email, unitCode: unitCode });
  }

  /**
   * Mở cửa sổ Google để người dùng chứng minh là chủ Gmail → access token.
   * PHẢI gọi ngay trong sự kiện bấm nút (không chờ gì trước), kẻo trình duyệt chặn cửa sổ.
   * @param {string} goiY — Gmail đã gõ (Google điền sẵn), có thể trống
   * @returns {Promise<string>}
   */
  function layMaGoogle(goiY) {
    return new Promise(function (resolve, reject) {
      var g = window.google;
      if (!g || !g.accounts || !g.accounts.oauth2) {
        reject(new Error('Chưa tải xong phần đăng nhập Google. Vui lòng tải lại trang.'));
        return;
      }
      g.accounts.oauth2.initTokenClient({
        client_id: CAU_HINH.GOOGLE_CLIENT_ID,
        scope: 'openid email',
        hint: goiY || '',
        prompt: goiY ? '' : 'select_account', // chưa gõ Gmail → luôn cho chọn tài khoản
        callback: function (res) {
          if (res && res.access_token) resolve(res.access_token);
          else reject(new Error('Google chưa xác nhận tài khoản. Vui lòng thử lại.'));
        },
        error_callback: function (err) {
          var dong = err && (err.type === 'popup_closed' || err.type === 'popup_failed_to_open');
          reject(new Error(dong
            ? 'Cửa sổ đăng nhập Google đã đóng hoặc bị chặn. Vui lòng bấm Đăng nhập lại.'
            : 'Không đăng nhập được Google. Vui lòng thử lại.'));
        }
      }).requestAccessToken();
    });
  }

  /**
   * Đăng nhập cách mới: GAS lấy Gmail từ mã Google, không tin Gmail gửi lên.
   * @returns {Promise<object>} như dangNhap, kèm email đã xác minh
   */
  function dangNhapGoogle(accessToken, unitCode) {
    return goi('dangNhapGoogle', { accessToken: accessToken, unitCode: unitCode });
  }

  /** Mở lại bằng vé nhớ đăng nhập → như dangNhap. */
  function dangNhapVe(ve, unitCode) {
    return goi('dangNhapVe', { ve: ve, unitCode: unitCode });
  }

  /** Vào không cần Gmail: bảng công khai đang mở của đơn vị. */
  function vaoCongKhai(unitCode) {
    return goi('vaoCongKhai', { unitCode: unitCode });
  }

  /**
   * Tài khoản được phân công của MỘT đơn vị (GAS không trả toàn bộ một lần).
   * @returns {Promise<object>} { ok, emails: [string] }
   */
  function layTaiKhoan(unitCode) {
    return goi('layTaiKhoan', { unitCode: unitCode });
  }

  /**
   * Đơn vị của một Gmail đã gõ đủ (chỉ khớp chính xác, không liệt kê).
   * @returns {Promise<object>} { ok, donVi: [{ unitCode, unitName }] }
   */
  function timDonViTheoEmail(email) {
    return goi('timDonViTheoEmail', { email: email });
  }

  /**
   * Đăng nhập quản trị: tài khoản vai trò Quản trị + mật khẩu quản trị.
   * @returns {Promise<object>} { ok, token, hetHanSau (giây) } | { ok:false, loi }
   */
  function quanTriDangNhap(email, unitCode, matKhau) {
    return goi('quanTriDangNhap', { email: email, unitCode: unitCode, matKhau: matKhau });
  }

  /** Huỷ phiên quản trị trên máy chủ. */
  function quanTriDangXuat(token) {
    return goi('quanTriDangXuat', { token: token });
  }

  /**
   * Dữ liệu trang quản trị (cần mã phiên quản trị).
   * @returns {Promise<object>} { ok, donVi, taiKhoan, bang, giao } | { ok:false, hetPhien }
   */
  function qtLayDuLieu(token) {
    return goi('qtLayDuLieu', { token: token });
  }

  // Lưu kèm chia quyền Drive từng file → có thể lâu (đơn vị quản lý: mọi file của bảng)
  var CHO_LUU = 300000;

  /** Thay Gmail của một đơn vị: ds = [{email, role}]; GAS tự chia sẻ / gỡ quyền file. */
  function qtLuuTaiKhoan(token, unitCode, ds) {
    return goi('qtLuuTaiKhoan', { token: token, unitCode: unitCode, ds: ds }, CHO_LUU);
  }

  /** Đơn vị quản lý + quyền từng đơn vị { unitCode: 'sua'|'xem'|'khong' } của một bảng; GAS tự chia sẻ / gỡ quyền file. */
  function qtLuuPhanQuyen(token, tableCode, managerUnits, units) {
    return goi('qtLuuPhanQuyen', { token: token, tableCode: tableCode, managerUnits: managerUnits, units: units }, CHO_LUU);
  }

  /**
   * Tạo kỳ (ngay 'yyyy-mm-dd') cho một bảng, từ đơn vị thứ batDau; GAS trả tiepTu nếu chưa xong.
   * hanKhoa 'yyyy-mm-dd' | '' (không tự khoá) | bỏ trống tham số (theo cài đặt bảng).
   */
  function qtTaoKy(token, tableCode, ngay, batDau, hanKhoa) {
    return goi('qtTaoKy', { token: token, tableCode: tableCode, ngay: ngay, batDau: batDau, hanKhoa: hanKhoa }, CHO_LUU);
  }

  /** Đặt / bỏ ('') ngày tự khoá (hanKhoa 'yyyy-mm-dd') của kỳ tenKy đang mở. */
  function qtHanKhoaKy(token, tableCode, tenKy, hanKhoa) {
    return goi('qtHanKhoaKy', { token: token, tableCode: tableCode, tenKy: tenKy, hanKhoa: hanKhoa }, CHO_LUU);
  }

  /** Khoá (khoa = true) / mở khoá kỳ tenKy ('dd.mm.yyyy') của một bảng, từ file thứ batDau. */
  /** Xoá kỳ ở mọi file đơn vị + file tổng (theo lô như khoá kỳ). */
  function qtXoaKy(token, tableCode, tenKy, batDau) {
    return goi('qtXoaKy', { token: token, tableCode: tableCode, tenKy: tenKy, batDau: batDau }, CHO_LUU);
  }

  function qtKhoaKy(token, tableCode, tenKy, khoa, batDau) {
    return goi('qtKhoaKy', { token: token, tableCode: tableCode, tenKy: tenKy, khoa: khoa, batDau: batDau }, CHO_LUU);
  }

  /**
   * Tạo bảng mới: GAS dựng file tổng theo khai báo cột + ghi tab Bảng.
   * maYeuCau: mã riêng mỗi lần bấm — GAS trả HTML rồi gọi lại thì không tạo hai lần.
   */
  function qtTaoBang(token, khai, maYeuCau) {
    return goi('qtTaoBang', { token: token, khai: khai, maYeuCau: maYeuCau }, CHO_LUU);
  }

  /**
   * Bảng mới từ Excel: khai (cài đặt + tenFile + duLieu base64) → GAS chuyển thành Sheet, kiểm mẫu.
   * Mẫu sai thì GAS không giữ file, trả { kiem }; đúng thì trả { bang, kiem: [] }.
   */
  function qtTaiMau(token, khai, maYeuCau) {
    return goi('qtTaiMau', { token: token, khai: khai, maYeuCau: maYeuCau }, CHO_LUU);
  }

  /** File Excel mẫu để tải về kẻ bảng: { tenFile, duLieu (base64) }. */
  function qtMauExcel(token) {
    return goi('qtMauExcel', { token: token }, CHO_LUU);
  }

  /** File người dùng chọn → Promise<chuỗi base64> (không kèm tiền tố data:). */
  function docFileBase64(file) {
    return new Promise(function (resolve, reject) {
      var doc = new FileReader();
      doc.onload = function () { resolve(String(doc.result).split(',')[1] || ''); };
      doc.onerror = function () { reject(new Error('Không đọc được file trên máy.')); };
      doc.readAsDataURL(file);
    });
  }

  /** Xoá bảng: file đơn vị + file tổng vào thùng rác Drive, xoá dòng ở Sheet quản lý. */
  function qtXoaBang(token, tableCode) {
    return goi('qtXoaBang', { token: token, tableCode: tableCode }, CHO_LUU);
  }

  /** Lưu cài đặt bảng đã có; GAS trả kèm kết quả kiểm mẫu. */
  function qtLuuBang(token, tableCode, caiDat) {
    return goi('qtLuuBang', { token: token, tableCode: tableCode, caiDat: caiDat }, CHO_LUU);
  }

  /** Kiểm file tổng của bảng theo quy ước 5.1 → { kiem: [{cho, loi, cach}] } */
  function qtKiemMau(token, tableCode) {
    return goi('qtKiemMau', { token: token, tableCode: tableCode }, CHO_LUU);
  }

  /** Thêm lĩnh vực (mã + tên) vào danh mục; GAS trả danh mục mới. */
  function qtThemLinhVuc(token, groupCode, groupName) {
    return goi('qtThemLinhVuc', { token: token, groupCode: groupCode, groupName: groupName }, CHO_LUU);
  }

  /** Thêm đơn vị vào tab Đơn vị; GAS kiểm mã trùng / không hợp lệ. */
  function qtThemDonVi(token, unitCode, unitName, region, role) {
    return goi('qtThemDonVi', { token: token, unitCode: unitCode, unitName: unitName, region: region, role: role }, CHO_LUU);
  }

  /** Giao bảng cho các đơn vị có mã ở cột A file tổng (thêm, không bỏ ai) + chia quyền file. */
  function qtGiaoTheoMau(token, tableCode) {
    return goi('qtGiaoTheoMau', { token: token, tableCode: tableCode }, CHO_LUU);
  }

  /** Đơn vị của một bảng cho mục Phân quyền, đọc từ cột A file tổng → { ma, laTach, coAll, sai } */
  function qtDonViBang(token, tableCode) {
    return goi('qtDonViBang', { token: token, tableCode: tableCode }, CHO_LUU);
  }

  /** Thêm một dòng cho đơn vị vào file tổng (bảng Sở giao dòng) + giao bảng cho đơn vị đó. */
  function qtThemDongDonVi(token, tableCode, unitCode) {
    return goi('qtThemDongDonVi', { token: token, tableCode: tableCode, unitCode: unitCode }, CHO_LUU);
  }

  return {
    goi: goi,
    qtGiaoTheoMau: qtGiaoTheoMau,
    qtDonViBang: qtDonViBang,
    qtThemDongDonVi: qtThemDongDonVi,
    qtThemLinhVuc: qtThemLinhVuc,
    qtThemDonVi: qtThemDonVi,
    qtTaoBang: qtTaoBang,
    qtTaiMau: qtTaiMau,
    qtMauExcel: qtMauExcel,
    qtXoaBang: qtXoaBang,
    docFileBase64: docFileBase64,
    qtLuuBang: qtLuuBang,
    qtKiemMau: qtKiemMau,
    qtLayDuLieu: qtLayDuLieu,
    qtLuuTaiKhoan: qtLuuTaiKhoan,
    qtLuuPhanQuyen: qtLuuPhanQuyen,
    qtTaoKy: qtTaoKy,
    qtKhoaKy: qtKhoaKy,
    qtXoaKy: qtXoaKy,
    qtHanKhoaKy: qtHanKhoaKy,
    layDanhSachDonVi: layDanhSachDonVi,
    layTaiKhoan: layTaiKhoan,
    timDonViTheoEmail: timDonViTheoEmail,
    dangNhap: dangNhap,
    layMaGoogle: layMaGoogle,
    dangNhapGoogle: dangNhapGoogle,
    dangNhapVe: dangNhapVe,
    vaoCongKhai: vaoCongKhai,
    quanTriDangNhap: quanTriDangNhap,
    quanTriDangXuat: quanTriDangXuat
  };
})();
