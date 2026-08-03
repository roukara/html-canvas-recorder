export const pickMime = (desired?: string) => {
  if (desired && MediaRecorder.isTypeSupported(desired)) return desired
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
    return 'video/webm;codecs=vp9'
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8'))
    return 'video/webm;codecs=vp8'
  if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm'
  if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'))
    return 'video/mp4;codecs=avc1.42E01E'
  return 'video/webm'
}

export const extFromMime = (m: string) => {
  const lower = (m || '').toLowerCase()
  if (lower.startsWith('video/mp4')) return 'mp4'
  if (lower.startsWith('video/ogg')) return 'ogv'
  return 'webm'
}
