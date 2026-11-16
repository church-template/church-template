// 업로드 전 이미지를 브라우저 canvas로 WebP로 바꾼다(#25) — 휴대폰 원본(수 MB·EXIF 위치정보)을 그대로 올리지 않게.
// canvas에 다시 그리면 EXIF가 떨어진다. 라이브러리 없이. 실패하면 원본을 돌려줘 업로드를 막지 않는다.
const MAX_SIDE = 1600;
const QUALITY = 0.82;
// GIF는 움직임이 사라지므로 제외, PDF 등 이미지 아닌 것도 제외.
const CONVERTIBLE = ["image/jpeg", "image/png", "image/webp"];

export function shouldConvert(type: string): boolean {
  return CONVERTIBLE.includes(type);
}

// 긴 변을 MAX_SIDE에 맞춰 비율 유지 축소(작은 사진은 그대로).
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function toWebp(file: File): Promise<File> {
  if (!shouldConvert(file.type)) return file;
  try {
    // createImageBitmap은 EXIF 회전을 반영해 디코딩한다(세로 사진이 눕지 않게).
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    // WebP 인코딩 미지원 브라우저는 PNG로 떨어진다 — 그땐 원본이 낫다.
    if (!blob || blob.type !== "image/webp") return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}
