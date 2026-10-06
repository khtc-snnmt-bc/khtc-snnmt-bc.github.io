// ============================================================
// bcsnn · js/config/cau-hinh.js
// Vai trò  : Hằng số cấu hình duy nhất — chủ dự án sửa tay file này
// Lớp      : config — không gọi ai
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 19:26
// ============================================================
// ⚠ KHÔNG ghi ID file, Gmail thật vào đây — repo Public!
// Chủ dự án: dán URL web app GAS vào dòng GAS_URL bên dưới.

var CAU_HINH = {
  // URL web app GAS (Deploy → Thực thi bằng: Tôi · Truy cập: Bất kỳ ai)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzLeaUrVN6FFPr-hpaLmwYecmvTMBb1okM7Ej4aOhDhipDDmOcw38JoDNowEfemoON_kQ/exec',

  // Thời gian chờ tối đa khi gọi GAS (ms) — lần đầu thường 3–10 giây
  GAS_TIMEOUT: 15000,

  // Số lần thử lại khi GAS trả lỗi (HTML thay vì JSON)
  GAS_THU_LAI: 2,

  // Client ID "Đăng nhập bằng Google" (mã công khai, không phải bí mật)
  GOOGLE_CLIENT_ID: '237899473140-bqtoitjtpstbv9hu0j0jsdljfnn4hpv2.apps.googleusercontent.com',

  // Lấy URL GAS: ưu tiên biến cấu hình, sau đó tới localStorage, rồi URL hash #gas=
  layGasUrl: function () {
    if (this.GAS_URL && this.GAS_URL.trim()) return this.GAS_URL.trim();
    try {
      var hash = new URLSearchParams(location.hash.slice(1)).get('gas');
      if (hash) {
        localStorage.setItem('bcsnn_gas_url', hash.trim());
        return hash.trim();
      }
      var luu = localStorage.getItem('bcsnn_gas_url');
      if (luu && luu.trim()) return luu.trim();
    } catch (e) {}
    return '';
  },

  luuGasUrl: function (url) {
    try {
      if (url) localStorage.setItem('bcsnn_gas_url', url.trim());
      else localStorage.removeItem('bcsnn_gas_url');
    } catch (e) {}
  }
};
