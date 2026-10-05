// ============================================================
// bcsnn · js/utils/dom.js
// Vai trò  : Hàm tiện ích DOM — rút gọn querySelector, tạo phần tử, ẩn/hiện
// Lớp      : utils — được gọi bởi: pages · được phép gọi: (không ai)
// Phiên bản: 0.1.0 · Cập nhật: 05/10/2026 12:25
// ============================================================

var DOM = (function () {
  'use strict';

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  /** Tạo phần tử HTML với thuộc tính và nội dung */
  function tao(tag, attrs, textContent) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (textContent !== undefined) el.textContent = textContent;
    return el;
  }

  /** Ẩn phần tử */
  function an(el) { if (el) el.classList.add('an'); }

  /** Hiện phần tử */
  function hien(el) { if (el) el.classList.remove('an'); }

  /** Bật/tắt lớp CSS */
  function batTat(el, lop, bat) { if (el) el.classList.toggle(lop, bat); }

  return { $: $, $$: $$, tao: tao, an: an, hien: hien, batTat: batTat };
})();
