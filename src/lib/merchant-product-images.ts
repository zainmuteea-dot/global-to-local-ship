export const PRODUCT_IMAGE_MAX_BYTES = 200 * 1024;
export const PRODUCT_IMAGE_VARIANTS = [400, 1200] as const;
export type ProductImageWidth = (typeof PRODUCT_IMAGE_VARIANTS)[number];

export type ProductImageVariant = {
  width: ProductImageWidth;
  file: File;
};

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("This browser could not encode the image as WebP."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

/** Creates a WebP variant at or below the requested maximum edge and 200 KB. */
async function createVariant(
  source: ImageBitmap,
  maxEdge: ProductImageWidth,
  name: string,
): Promise<ProductImageVariant> {
  let scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");

  try {
    for (let sizePass = 0; sizePass < 14; sizePass += 1) {
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas image processing is unavailable.");
      context.drawImage(source, 0, 0, width, height);

      for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.24]) {
        const blob = await canvasToWebp(canvas, quality);
        if (blob.size <= PRODUCT_IMAGE_MAX_BYTES) {
          return {
            width: maxEdge,
            file: new File([blob], name, { type: "image/webp", lastModified: Date.now() }),
          };
        }
      }
      // Keep the requested width whenever possible; reduce only when encoding quality is insufficient.
      scale *= 0.88;
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }

  throw new Error("The image could not be compressed below 200 KB.");
}

export async function createProductWebpVariants(file: File): Promise<ProductImageVariant[]> {
  let source: ImageBitmap;
  try {
    source = await createImageBitmap(file);
  } catch {
    throw new Error(
      "The selected image could not be opened. Choose a valid JPG, PNG, or WebP image.",
    );
  }

  try {
    const id = crypto.randomUUID();
    return await Promise.all(
      PRODUCT_IMAGE_VARIANTS.map((width) => createVariant(source, width, `${id}-${width}.webp`)),
    );
  } finally {
    source.close();
  }
}

export function productImageVariantPaths(path: string): [string, string] | null {
  const match = path.match(/^(.*)-(?:400|1200)\.webp$/i);
  if (!match) return null;
  return [`${match[1]}-400.webp`, `${match[1]}-1200.webp`];
}

export function productImageVariantPath(path: string, width: ProductImageWidth): string | null {
  const paths = productImageVariantPaths(path);
  if (!paths) return null;
  return width === 400 ? paths[0] : paths[1];
}
