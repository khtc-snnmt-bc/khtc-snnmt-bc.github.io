// ============================================================
// bcsnn · app/kiem-thu/kiem-gas-google.mjs
// Vai trò  : Kiểm hàm thuần kiemMaGoogle_, kiemMaTruyCap_ (xác minh mã Google) bằng Node
// Chạy     : node app/kiem-thu/kiem-gas-google.mjs
// Phiên bản: 0.2.0 · Cập nhật: 06/10/2026 19:26
// ============================================================
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ma = readFileSync(new URL('../gas/XacMinhGoogle.js', import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(ma + '\n;this.ham = { kiemMaGoogle_, kiemMaTruyCap_ };', sandbox);
const kiem = (...a) => JSON.parse(JSON.stringify(sandbox.ham.kiemMaGoogle_(...a)));
const kiemTC = (...a) => JSON.parse(JSON.stringify(sandbox.ham.kiemMaTruyCap_(...a)));

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

// access token (nút Đăng nhập của app — b06g)
const tc = { aud: CID, azp: CID, email: ' B@Gmail.com', email_verified: 'true', expires_in: '3500', scope: 'openid email' };
assert.deepEqual(kiemTC(tc, CID), { ok: true, email: 'b@gmail.com' });
assert.equal(kiemTC({ ...tc, aud: 'app-khac' }, CID).ok, false);
assert.equal(kiemTC({ ...tc, email_verified: 'false' }, CID).ok, false);
assert.equal(kiemTC({ ...tc, expires_in: '0' }, CID).ok, false);
assert.equal(kiemTC({ ...tc, expires_in: undefined }, CID).ok, false);
assert.equal(kiemTC({ ...tc, email: undefined }, CID).ok, false);
assert.equal(kiemTC(null, CID).ok, false);

console.log('kiem-gas-google: 15 bài ĐẠT!');
