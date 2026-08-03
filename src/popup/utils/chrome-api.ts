import type { FromContent, ToContent } from '../../types'

export async function sendToContent<T extends FromContent = FromContent>(
  tabId: number,
  msg: ToContent,
  frameId?: number,
): Promise<T> {
  return chrome.tabs.sendMessage(
    tabId,
    msg,
    frameId == null ? undefined : { frameId },
  ) as Promise<T>
}

export async function getTabFrames(tabId: number): Promise<
  Array<{ frameId: number; url?: string }>
> {
  return new Promise((resolve) => {
    chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
      resolve(
        frames?.map((frame) => ({
          frameId: frame.frameId,
          url: frame.url,
        })) ?? [{ frameId: 0 }],
      )
    })
  })
}

export async function sendToAllContentFrames(
  tabId: number,
  msg: ToContent,
): Promise<void> {
  const frames = await getTabFrames(tabId)
  await Promise.allSettled(
    frames.map((frame) => sendToContent(tabId, msg, frame.frameId)),
  )
}
