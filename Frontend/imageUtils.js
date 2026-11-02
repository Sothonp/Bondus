/* Photos of the student's answer sheets: shrunk on the phone before anything is stored or sent, so a 12-megapixel
   camera picture becomes roughly 300-500 KB. fitWithin() is the pure size rule; shrinkImage() does the work in a browser. */

const MAX_INPUT_BYTES = 30 * 1024 * 1024; // refuse absurd files before decoding them

/* The size that fits `w` x `h` inside a `max` x `max` box, same shape, whole pixels, never larger than the original. */
export function fitWithin(w, h, max) {
  if (![w, h, max].every((n) => Number.isFinite(n) && n > 0)) return null;
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

async function decode(file) {
  // imageOrientation makes a phone photo taken sideways come out upright
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("not_image"));
      img.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

function drawn(source, size) {
  const canvas = document.createElement("canvas");
  canvas.width = size.w; canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size.w, size.h); // a transparent PNG would turn black as a JPEG
  ctx.drawImage(source, 0, 0, size.w, size.h);
  return canvas;
}
const toBlob = (canvas, quality) => new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("not_image"))), "image/jpeg", quality));

/* Resolves to { blob, thumb, w, h, bytes }: `blob` is the picture to upload (longest side maxSide, JPEG), `thumb` a small
   data URL to show and keep locally. Rejects with Error("not_image") or Error("too_big"). */
export async function shrinkImage(file, { maxSide = 1600, quality = 0.8, thumbSide = 320, thumbQuality = 0.7 } = {}) {
  if (!file || !/^image\//.test(file.type || "")) throw new Error("not_image");
  if (file.size > MAX_INPUT_BYTES) throw new Error("too_big");
  const source = await decode(file);
  const natural = { w: source.width, h: source.height };
  const size = fitWithin(natural.w, natural.h, maxSide);
  const small = fitWithin(natural.w, natural.h, thumbSide);
  if (!size || !small) throw new Error("not_image");
  const blob = await toBlob(drawn(source, size), quality);
  const thumb = drawn(source, small).toDataURL("image/jpeg", thumbQuality);
  if (typeof source.close === "function") source.close();
  return { blob, thumb, w: size.w, h: size.h, bytes: blob.size };
}

/* The biggest centred square in a `w` x `h` picture, as { sx, sy, side } (where to start cutting, and how long each side is),
   or null for a size that is not a picture. A profile photo is a circle, so the middle of the picture is what is kept. */
export function squareCrop(w, h) {
  if (![w, h].every((n) => Number.isFinite(n) && n > 0)) return null;
  const side = Math.floor(Math.min(w, h));
  return { sx: Math.floor((w - side) / 2), sy: Math.floor((h - side) / 2), side };
}

/* The smallest picture the server takes as a profile photo (config/bondus.php avatar.min_pixels in the backend). */
export const AVATAR_MIN_SIDE = 32;

/* A profile photo from any picture the student chose: the middle square, at most `side` pixels each way (a smaller picture
   is not enlarged), as a JPEG a few dozen KB big. Drawing it again also leaves behind the camera's own details, such as
   where the photo was taken. Resolves to { blob, dataUrl, side, bytes }: `blob` is what gets uploaded, `dataUrl` the same
   picture to show at once. Rejects with Error("not_image"), Error("too_big") or Error("too_small"). */
export async function shrinkAvatar(file, { side = 256, quality = 0.85 } = {}) {
  if (!file || !/^image\//.test(file.type || "")) throw new Error("not_image");
  if (file.size > MAX_INPUT_BYTES) throw new Error("too_big");
  const source = await decode(file);
  const crop = squareCrop(source.width, source.height);
  if (!crop) throw new Error("not_image");
  if (crop.side < AVATAR_MIN_SIDE) throw new Error("too_small");
  const out = Math.min(side, crop.side);
  const canvas = document.createElement("canvas");
  canvas.width = out; canvas.height = out;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, out, out); // a transparent PNG would turn black as a JPEG
  ctx.drawImage(source, crop.sx, crop.sy, crop.side, crop.side, 0, 0, out, out);
  const blob = await toBlob(canvas, quality);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (typeof source.close === "function") source.close();
  return { blob, dataUrl, side: out, bytes: blob.size };
}
