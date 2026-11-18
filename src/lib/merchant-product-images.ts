// Upload only a 400px card image and a maximum 800px detail image.
export const PRODUCT_IMAGE_VARIANTS = [400, 800] as const;
export type ProductImageWidth = 400 | 600 | 800 | 1200;
type ProductUploadWidth = (typeof PRODUCT_IMAGE_VARIANTS)[number];

export type ProductImageVariant = {
  width: ProductUploadWidth;
  file: File;
};

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("تعذر تحويل الصورة إلى WebP في هذا المتصفح."));
      resolve(blob);
    }, "image/webp", quality);
  });
}

async function createVariant(source: ImageBitmap, maxWidth: ProductUploadWidth, name: string): Promise<ProductImageVariant> {
  let width = Math.max(1, Math.round(source.width * Math.min(1, maxWidth / source.width)));
  let height = Math.max(1, Math.round(source.height * (width / source.width)));
  const canvas = document.createElement("canvas");
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas image processing is unavailable.");
    let quality = 0.7;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(source, 0, 0, width, height);
      blob = await canvasToWebp(canvas, quality);
      if (blob.type !== "image/webp") throw new Error("تعذر إنشاء صورة WebP في هذا المتصفح.");
      if (blob.size <= 300 * 1024) break;
      if (quality > 0.5) quality = Math.max(0.5, quality - 0.05);
      else {
        width = Math.max(1, Math.floor(width * 0.9));
        height = Math.max(1, Math.floor(height * 0.9));
        quality = 0.7;
      }
    }
    if (!blob || blob.size > 300 * 1024) throw new Error("تعذر ضغط الصورة إلى أقل من 300 كيلوبايت.");
    return { width: maxWidth, file: new File([blob], name, { type: "image/webp", lastModified: Date.now() }) };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function createStoreWebp(file: File): Promise<File> {
  let source: ImageBitmap;
  try { source = await createImageBitmap(file); }
  catch { throw new Error("اختر صورة JPG أو PNG أو WebP صالحة."); }
  try {
    return (await createVariant(source, 800, `${crypto.randomUUID()}-800.webp`)).file;
  } finally { source.close(); }
}

export async function createProductWebpVariants(file: File): Promise<ProductImageVariant[]> {
  let source: ImageBitmap;
  try { source = await createImageBitmap(file); }
  catch { throw new Error("اختر صورة JPG أو PNG أو WebP صالحة."); }
  try {
    const id = crypto.randomUUID();
    return await Promise.all(PRODUCT_IMAGE_VARIANTS.map((width) => createVariant(source, width, `${id}-${width}.webp`)));
  } finally { source.close(); }
}

export function productImageVariantPaths(path: string): string[] | null {
  const match = path.match(/^(.*)-(400|800|1200)\.webp$/i);
  if (!match) return null;
  // New uploads use 400/800; older records used 400/1200.
  return match[2] === "1200"
    ? [`${match[1]}-400.webp`, `${match[1]}-1200.webp`]
    : [`${match[1]}-400.webp`, `${match[1]}-800.webp`];
}

export function productImageVariantPath(path: string, width: ProductImageWidth): string | null {
  const match = path.match(/^(.*)-(400|800|1200)\.webp$/i);
  if (!match) return null;
  if (width === 400) return `${match[1]}-400.webp`;
  if (width === 600) return null;
  if (width === 1200) return match[2] === "1200" ? path : null;
  if (match[2] === "800") return path;
  if (match[2] === "400") return `${match[1]}-800.webp`;
  // Older 1200px records use Supabase transforms for 600px and 800px views.
  return null;
}
