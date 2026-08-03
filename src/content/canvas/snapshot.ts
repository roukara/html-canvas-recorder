import { saveViaAnchor } from '../utils/save'
import { findCanvasByRecorderId } from './dom'

export function saveCanvasSnapshot(id: string): string {
  const canvas = findCanvasByRecorderId(id)
  if (!canvas) throw new Error('Canvas not found')

  const timestamp = new Date().toISOString().replaceAll(':', '-')
  const fileName = `canvas-${id}-${timestamp}.png`
  const href = canvas.toDataURL('image/png')
  saveViaAnchor({ href, fileName })
  return fileName
}
