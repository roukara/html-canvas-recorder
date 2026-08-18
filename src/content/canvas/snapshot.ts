import { saveViaAnchor } from '../utils/save'
import { findCanvasByRecorderId } from './dom'
import { RecorderError } from '../../utils/error'

export function saveCanvasSnapshot(id: string): string {
  const canvas = findCanvasByRecorderId(id)
  if (!canvas) throw new RecorderError('Canvas not found', 'canvas-missing')

  const timestamp = new Date().toISOString().replaceAll(':', '-')
  const fileName = `canvas-${id}-${timestamp}.png`
  const href = canvas.toDataURL('image/png')
  saveViaAnchor({ href, fileName })
  return fileName
}
