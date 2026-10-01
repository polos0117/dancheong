// 내려받기 (브라우저 전용 — 테스트하지 않고 화면에서 확인)
function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const downloadSvg = (svg: string, name: string) => save(new Blob([svg], { type: 'image/svg+xml' }), name);

// SVG 를 이미지로 읽어 원하는 크기의 캔버스에 그린 뒤 PNG 로 (글자가 없어 웹 서체 걱정 없음)
export async function downloadPng(svg: string, w: number, h: number, name: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('PNG 를 만들지 못했어요');
    save(blob, name);
  } finally {
    URL.revokeObjectURL(url);
  }
}
