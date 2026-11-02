/* The profile photo on the phone's side: cutting the middle square out of a picture, the two API calls, what carries the
   server's photo address into the profile, and how the screens use it. App.jsx and the components are read as text
   because the app has no DOM test harness (the same way chapterWiring.test.js does it).
   Run with:  node --test Frontend/profilePhoto.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createApi, ApiError } from "./api.js";
import { squareCrop, shrinkAvatar, AVATAR_MIN_SIDE } from "./imageUtils.js";
import { userToProfile } from "./serverMapping.js";
import { MORE_STRINGS } from "./moreStrings.js";

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
const app = read("App.jsx");
const nav = read("MobileNav.jsx");
const profileUi = read("ProfileUi.jsx");
const face = read("Avatar.jsx");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const BASE = "https://api.example.test/api/v1";
const memoryStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function make(reply) {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return reply(url, init); };
  const api = createApi({ baseUrl: BASE, fetchImpl, storage: memoryStorage() });
  return { api, calls };
}

test("squareCrop takes the biggest square from the middle", () => {
  assert.deepEqual(squareCrop(4000, 3000), { sx: 500, sy: 0, side: 3000 });   // landscape: cut the sides
  assert.deepEqual(squareCrop(3000, 4000), { sx: 0, sy: 500, side: 3000 });   // portrait: cut the top and bottom
  assert.deepEqual(squareCrop(500, 500), { sx: 0, sy: 0, side: 500 });
  assert.deepEqual(squareCrop(301, 100), { sx: 100, sy: 0, side: 100 });      // an odd leftover rounds down, never past the edge
});

test("squareCrop refuses a size that is not a picture", () => {
  for (const [w, h] of [[0, 10], [10, 0], [-5, 10], [NaN, 10], [10, Infinity], [undefined, 10]]) assert.equal(squareCrop(w, h), null, `${w} x ${h}`);
});

test("a photo must be at least as big as the server accepts", () => {
  assert.equal(AVATAR_MIN_SIDE, 32); // the backend's avatar.min_pixels
});

test("shrinkAvatar refuses what is not a picture, or is absurdly big, before it decodes anything", async () => {
  await assert.rejects(() => shrinkAvatar(null), { message: "not_image" });
  await assert.rejects(() => shrinkAvatar({ type: "application/pdf", size: 10 }), { message: "not_image" });
  await assert.rejects(() => shrinkAvatar({ type: "", size: 10 }), { message: "not_image" });
  await assert.rejects(() => shrinkAvatar({ type: "image/jpeg", size: 31 * 1024 * 1024 }), { message: "too_big" });
});

test("uploadAvatar sends the picture as a real FormData field named avatar, signed in, never as JSON", async () => {
  const { api, calls } = make(() => json(200, { user: { avatarSource: "upload" } }));
  const picture = new Blob(["jpeg-bytes"], { type: "image/jpeg" });
  const res = await api.uploadAvatar(picture);

  const call = calls.at(-1);
  assert.equal(res.user.avatarSource, "upload");
  assert.deepEqual([call.init.method, call.url], ["POST", `${BASE}/me/avatar`]);
  assert.ok(call.init.body instanceof FormData);
  const sent = call.init.body.get("avatar");
  assert.equal(sent.name, "avatar.jpg");
  assert.equal(await sent.text(), "jpeg-bytes");
  assert.equal(call.init.headers["Content-Type"], undefined, "the browser sets the multipart boundary itself");
  assert.equal(call.init.headers.Accept, "application/json");
});

test("uploadAvatar carries the sign-in token", async () => {
  const { api, calls } = make((url) => (url.endsWith("/auth/google") ? json(200, { user: {}, token: "tok_1" }) : json(200, { user: {} })));
  await api.loginWithGoogle("credential");
  await api.uploadAvatar(new Blob(["x"], { type: "image/jpeg" }));
  assert.equal(calls.at(-1).init.headers.Authorization, "Bearer tok_1");
});

test("removeAvatar is a DELETE of the signed-in student's photo", async () => {
  const { api, calls } = make(() => json(200, { user: { avatarSource: null } }));
  const res = await api.removeAvatar();
  assert.deepEqual([calls[0].init.method, calls[0].url], ["DELETE", `${BASE}/me/avatar`]);
  assert.equal(res.user.avatarSource, null);
});

test("a refused picture and too many tries come back as errors the screen can word", async () => {
  const refused = make(() => json(422, { message: "The avatar field must be an image.", errors: { avatar: ["The avatar field must be an image."] } }));
  await assert.rejects(() => refused.api.uploadAvatar(new Blob(["x"])), (e) => e instanceof ApiError && e.status === 422 && e.errors?.avatar?.length === 1);

  const busy = make(() => json(429, { message: "Too Many Attempts.", code: "too_many_requests", retryAfter: 30 }));
  await assert.rejects(() => busy.api.uploadAvatar(new Blob(["x"])), (e) => e.code === "too_many_requests" && e.retryAfter === 30);

  const offline = createApi({ baseUrl: BASE, fetchImpl: async () => { throw new Error("offline"); }, storage: memoryStorage() });
  await assert.rejects(() => offline.uploadAvatar(new Blob(["x"])), (e) => e.code === "network_error");
});

test("the server's photo address and source are kept on the profile", () => {
  const profile = userToProfile({ id: 7, createdAt: "x", name: "Sokha", avatarUrl: "https://lh3.googleusercontent.com/a/me=s256-c", avatarSource: "google" });
  assert.equal(profile.avatarUrl, "https://lh3.googleusercontent.com/a/me=s256-c");
  assert.equal(profile.avatarSource, "google");
  assert.equal(userToProfile({ id: 8, avatarUrl: null, avatarSource: null }).avatarUrl, null);
});

test("the face shows the photo, and the initials when there is none or it will not load", () => {
  const code = strip(face);
  assert.match(code, /if \(src && failed !== src\)/, "a photo is shown only while it has not failed");
  assert.match(code, /onError=\{\(\) => setFailed\(src\)\}/, "a photo that fails to load falls back to the initials");
  assert.match(code, /return <>\{initials\}<\/>;/);
  assert.match(code, /referrerPolicy="no-referrer"/);
  assert.match(code, /alt=""/, "the button around it has the accessible name");
});

test("the phone's top bar and the desktop header both show the photo", () => {
  assert.match(nav, /export function MobileTopBar\(\{ logo, initials, avatarUrl = null,/);
  assert.match(nav, /<AvatarFace src=\{avatarUrl\} initials=\{initials\} \/>/);
  assert.match(app, /<MobileTopBar logo=\{<BondusLogo \/>\} initials=\{initials\} avatarUrl=\{profile\.avatarUrl\}/);
  assert.match(app, /<AvatarFace src=\{profile\.avatarUrl\} initials=\{initials\} \/><\/button>/);
  // the round button clips the picture to its circle
  assert.match(nav, /rounded-full overflow-hidden[^"]*w-9 h-9/);
});

test("the Profile page gets the photo handlers, and they shrink first and then talk to the server", () => {
  assert.match(app, /initials=\{initials\} onUploadPhoto=\{handleUploadPhoto\} onRemovePhoto=\{handleRemovePhoto\}/);
  assert.match(app, /import \{ shrinkAvatar \} from "\.\/imageUtils\.js";/);
  const upload = app.slice(app.indexOf("const handleUploadPhoto"), app.indexOf("const handleRemovePhoto"));
  assert.ok(upload.indexOf("shrinkAvatar(file)") > -1 && upload.indexOf("shrinkAvatar(file)") < upload.indexOf("api.uploadAvatar(picture.blob)"), "shrunk before it is sent");
  assert.match(upload, /PHOTO_PROBLEM\[err\?\.message\] \?\? "photo_not_image"/);
  assert.match(app, /PHOTO_PROBLEM = \{ too_big: "photo_too_big", too_small: "photo_too_small", not_image: "photo_not_image" \}/);
  assert.match(upload, /if \(!SERVER_MODE\) \{ setProfile\(\(cur\) => \(\{ \.\.\.cur, avatarUrl: picture\.dataUrl, avatarSource: "upload" \}\)\); return \{ ok: true \}; \}/, "browser-only mode keeps the picture in memory");
  assert.match(app, /const handleRemovePhoto = async \(\) => \{[\s\S]*api\.removeAvatar\(\)/);
});

test("the photo card offers Remove only for a photo the student uploaded, and says where the photo comes from", () => {
  const code = strip(profileUi);
  assert.match(code, /\{source === "upload" && \(\s*<button type="button" onClick=\{remove\}/);
  assert.match(code, /source === "upload" \? "photoSourceUpload" : source === "google" \? "photoSourceGoogle" : "photoSourceNone"/);
  // (checked on the file as written: stripping comments would take `image/*` for the start of one)
  assert.match(profileUi, /<input ref=\{picker\} type="file" accept="image\/\*" hidden onChange=\{choose\} \/>/);
  assert.match(code, /event\.target\.value = ""/, "choosing the same picture twice still counts");
  // the card is only drawn when the screen supplies the handlers, so a Profile page without them is unchanged
  assert.match(code, /\{onUploadPhoto && onRemovePhoto && \(/);
});

test("every photo message has words in both languages, and a server refusal or a lost connection is not shown as the generic one", () => {
  for (const key of ["photoHeading", "photoSourceGoogle", "photoSourceUpload", "photoSourceNone", "photoUpload", "photoChange", "photoRemove", "photoUploading", "photoSaved", "photoRemoved", "photoErrNotImage", "photoErrTooBig", "photoErrTooSmall", "photoErrRefused", "photoErrGeneric"]) {
    assert.ok(MORE_STRINGS.en[key], `${key} (English)`);
    assert.ok(/[ក-៿]/.test(MORE_STRINGS.km[key]), `${key} (Khmer)`);
  }
  const code = strip(profileUi);
  assert.match(code, /case "validation_failed": return tr\("photoErrRefused"\);/);
  assert.match(code, /errorText\?\.\(result\.code, result\.retryAfter\)/, "no connection, too many tries and being signed out use the app's usual wording");
});
