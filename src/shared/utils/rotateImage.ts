/**
 * Canvas 기반 이미지 회전 유틸리티
 * File → HTMLImageElement → Canvas 회전 → 새 File 반환
 */
export async function rotateImageFile(
  file: File,
  degrees: 90 | 180 | 270,
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const swap = degrees === 90 || degrees === 270
  const canvas = new OffscreenCanvas(
    swap ? bitmap.height : bitmap.width,
    swap ? bitmap.width : bitmap.height,
  )
  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((degrees * Math.PI) / 180)
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  bitmap.close()

  const blob = await canvas.convertToBlob({ type: file.type || 'image/jpeg' })
  return new File([blob], file.name, { type: file.type, lastModified: Date.now() })
}
