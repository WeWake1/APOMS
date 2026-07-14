// Client-side photo compression: max ~1600px long edge, JPEG ~80%,
// so uploads stay fast on factory-floor mobile data.
export async function compressPhoto(file: Blob): Promise<Blob> {
  const MAX_EDGE = 1600;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // let the server accept the original

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.8)
  );
  return blob ?? file;
}
