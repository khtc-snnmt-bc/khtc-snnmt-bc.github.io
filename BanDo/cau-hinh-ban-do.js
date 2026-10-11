// ============================================================
// bcsnn · BanDo/cau-hinh-ban-do.js
// Vai trò  : Lớp Công khai của bản đồ (tên, màu, thứ tự) + khung thành phố
// Lớp      : config — SINH TỰ ĐỘNG bởi bando/cong-cu/day-ban-do.py từ danh-sach-lop.xlsx, đừng sửa tay
//            (địa chỉ kho file thì sửa hằng KHO trong day-ban-do.py)
// Phiên bản: 0.2.0 · Cập nhật: 11/10/2026 14:43
// ============================================================

var CAU_HINH_BAN_DO = {
  KHO: "/kho/",
  KHUNG_THANH_PHO: [106.3355, 10.3235, 107.5719, 11.4995],
  NHOM_LOP_CONG_KHAI: [
    {
      "id": "khoanh_dat",
      "ten": "Khoanh đất",
      "hinh": "vung",
      "loai": [
        {
          "ma": "LUC",
          "ten": "Đất chuyên trồng lúa",
          "mau": "#FFFC82"
        },
        {
          "ma": "CLN",
          "ten": "Đất trồng cây lâu năm",
          "mau": "#FFD7AA"
        },
        {
          "ma": "HNK",
          "ten": "Đất trồng cây hằng năm khác",
          "mau": "#FFF0B4"
        }
      ]
    }
  ]
};
