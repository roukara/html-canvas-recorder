export interface DownloadFile {
  href: string
  fileName: string
  revoke?: () => void
}

export function saveViaAnchor(file: DownloadFile): void {
  const anchor = document.createElement('a')
  anchor.href = file.href
  anchor.download = file.fileName
  document.documentElement.appendChild(anchor)
  anchor.click()
  anchor.remove()
  if (file.revoke) setTimeout(file.revoke, 10_000)
}

export function fileFromBlob(blob: Blob, fileName: string): DownloadFile {
  const url = URL.createObjectURL(blob)
  return {
    href: url,
    fileName,
    revoke: () => URL.revokeObjectURL(url),
  }
}
