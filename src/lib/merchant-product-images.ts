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
  const scale = Math.min(1, maxWidth / source.width);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas image processing is unavailable.");
    context.drawImage(source, 0, 0, width, height);
    const blob = await canvasToWebp(canvas, 0.7);
    return { width: maxWidth, file: new File([blob], name, { type: "image/webp", lastModified: Date.now() }) };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
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
