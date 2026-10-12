// ============================================================
// bcsnn · BanDo/cau-hinh-ban-do.js
// Vai trò  : Lớp Công khai của bản đồ (tên, màu, thứ tự) + khung thành phố
// Lớp      : config — SINH TỰ ĐỘNG bởi bando/cong-cu/day-ban-do.py từ danh-sach-lop.xlsx, đừng sửa tay
//            (địa chỉ kho file thì sửa hằng KHO trong day-ban-do.py)
// Phiên bản: 0.3.0 · Cập nhật: 12/10/2026 23:32
// PHIEN_BAN: tên file trên kho (không đuôi) → phiên bản theo nội dung. Lớp Nội bộ chỉ có nb-cau-hinh
//            (tên + phiên bản các lớp Nội bộ nằm trong file đó, Worker chỉ trả khi có quyền)
// ============================================================

var CAU_HINH_BAN_DO = {
  KHO: "https://bando-snnmt.gsheet.workers.dev/",
  PHIEN_BAN: {"ck-khoanh_dat": "38d7da71", "ck-ranh_xa": "73dfc69e", "ck-loai-dat": "cb5b7b24", "nb-cau-hinh": "6f504aae"},
  KHUNG_THANH_PHO: [106.3352, 10.32, 107.5719, 11.5014],
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
    },
    {
      "id": "ranh_xa",
      "ten": "Ranh xã",
      "hinh": "vung",
      "loai": [
        {
          "ma": "",
          "ten": "Ranh xã",
          "mau": "#7B2D8E"
        }
      ],
      "vien": true
    }
  ]
};
