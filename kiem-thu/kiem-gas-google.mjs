// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-google.mjs
// Vai trò  : Kiểm hàm thuần kiemMaGoogle_ (xác minh mã Google) bằng Node
// Chạy     : node app/kiem-thu/kiem-gas-google.mjs
// Phiên bản: 0.1.0 · Cập nhật: 06/10/2026 15:35
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ma = readFileSync(new URL('../gas/XacMinhGoogle.js', import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(ma + '\n;this.ham = { kiemMaGoogle_ };', sandbox);
const kiem = (...a) => JSON.parse(JSON.stringify(sandbox.ham.kiemMaGoogle_(...a)));

const CID = 'app-thu.apps.googleusercontent.com';
const tot = { aud: CID, iss: 'https://accounts.google.com', email: ' A@Gmail.com ', email_verified: 'true', exp: '2000' };

assert.deepEqual(kiem(tot, CID, 1000), { ok: true, email: 'a@gmail.com' });
assert.equal(kiem({ ...tot, iss: 'accounts.google.com' }, CID, 1000).ok, true);
assert.equal(kiem({ ...tot, aud: 'app-khac' }, CID, 1000).ok, false);
assert.equal(kiem({ ...tot, iss: 'https://giamao.example' }, CID, 1000).ok, false);
assert.equal(kiem({ ...tot, email_verified: 'false' }, CID, 1000).ok, false);
assert.equal(kiem(tot, CID, 2000).ok, false);
assert.equal(kiem(null, CID, 1000).ok, false);
assert.equal(kiem({ aud: CID }, CID, 1000).ok, false);

console.log('kiem-gas-google: 8 bài ĐẠT!');
