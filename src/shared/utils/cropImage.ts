/**
 * Canvas 기반 이미지 크롭 유틸리티
 * File → ImageBitmap → Canvas 크롭 → 새 File 반환
 */
export async function cropImageFile(
  file: File,
  rect: { x: number; y: number; width: number; height: number },
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(rect.width, rect.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    bitmap,
    rect.x, rect.y, rect.width, rect.height,
    0, 0, rect.width, rect.height,
  )
  bitmap.close()

  const blob = await canvas.convertToBlob({ type: file.type || 'image/jpeg' })
  return new File([blob], file.name, { type: file.type, lastModified: Date.now() })
}
