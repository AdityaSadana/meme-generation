function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function drawMeme(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  topText: string,
  bottomText: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(16, Math.floor(img.width / 20));
      ctx.font = `bold ${fontSize}px Impact, "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = Math.max(4, fontSize / 7);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillStyle = 'white';
      ctx.lineJoin = 'round';

      const padding = fontSize * 0.5;
      const maxWidth = img.width - padding * 2;
      const lineHeight = fontSize * 1.15;

      if (topText) {
        const lines = wrapText(ctx, topText.toUpperCase(), maxWidth);
        lines.forEach((line, i) => {
          const y = padding + fontSize + i * lineHeight;
          ctx.strokeText(line, img.width / 2, y);
          ctx.fillText(line, img.width / 2, y);
        });
      }

      if (bottomText) {
        const lines = wrapText(ctx, bottomText.toUpperCase(), maxWidth);
        const totalHeight = lines.length * lineHeight;
        const startY = img.height - padding - totalHeight + fontSize;
        lines.forEach((line, i) => {
          const y = startY + i * lineHeight;
          ctx.strokeText(line, img.width / 2, y);
          ctx.fillText(line, img.width / 2, y);
        });
      }

      resolve();
    };

    img.onerror = reject;
    img.src = imageUrl;
  });
}
