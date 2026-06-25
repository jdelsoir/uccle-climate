import { toPng } from 'html-to-image'

export async function shareNode(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, { pixelRatio: 2 })
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Uccle Climate' })
    return
  }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
