export type ProcessedImage = {
  width: number;
  height: number;
  dataUrl: string;
};

async function createImageCanvas(image: HTMLImageElement, maxDimension = 1024) {
  const aspect = image.naturalWidth / image.naturalHeight;
  const width = image.naturalWidth > image.naturalHeight ? maxDimension : Math.round(maxDimension * aspect);
  const height = image.naturalHeight >= image.naturalWidth ? maxDimension : Math.round(maxDimension / aspect);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas context');
  }
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function getLuminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getBackgroundLuminance(data: Uint8ClampedArray, width: number, height: number) {
  let sum = 0;
  let count = 0;

  const addPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    sum += getLuminance(data[idx], data[idx + 1], data[idx + 2]);
    count += 1;
  };

  for (let x = 0; x < width; x += 2) {
    addPixel(x, 0);
    addPixel(x, height - 1);
  }
  for (let y = 0; y < height; y += 2) {
    addPixel(0, y);
    addPixel(width - 1, y);
  }

  return count ? sum / count : 127;
}

function findCoinBounds(imageData: ImageData) {
  const { data, width, height } = imageData;
  const background = getBackgroundLuminance(data, width, height);
  const threshold = Math.max(16, Math.min(48, Math.abs(background - 128) + 24));

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hitCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      if (Math.abs(lum - background) > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        hitCount += 1;
      }
    }
  }

  if (hitCount < 100) {
    return null;
  }

  const widthRange = maxX - minX;
  const heightRange = maxY - minY;
  if (widthRange <= 0 || heightRange <= 0) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: widthRange + 1,
    height: heightRange + 1,
  };
}

function padSquareBounds(bounds: { x: number; y: number; width: number; height: number }, canvasWidth: number, canvasHeight: number) {
  const size = Math.max(bounds.width, bounds.height);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const halfSize = Math.min(Math.max(size * 0.6, size / 2), Math.min(canvasWidth, canvasHeight) / 2);

  const x = Math.max(0, Math.round(centerX - halfSize));
  const y = Math.max(0, Math.round(centerY - halfSize));
  const squareSize = Math.min(Math.round(halfSize * 2), Math.min(canvasWidth - x, canvasHeight - y));

  return { x, y, size: squareSize };
}

export async function detectAndCropCoin(image: HTMLImageElement): Promise<ProcessedImage> {
  const sourceCanvas = await createImageCanvas(image, 1024);
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get canvas context');
  }

  const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const bounds = findCoinBounds(imageData);

  const crop = bounds
    ? padSquareBounds(bounds, sourceCanvas.width, sourceCanvas.height)
    : {
        x: Math.round((sourceCanvas.width - Math.min(sourceCanvas.width, sourceCanvas.height)) / 2),
        y: Math.round((sourceCanvas.height - Math.min(sourceCanvas.width, sourceCanvas.height)) / 2),
        size: Math.min(sourceCanvas.width, sourceCanvas.height),
      };

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = crop.size;
  targetCanvas.height = crop.size;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) {
    throw new Error('Unable to create target canvas context');
  }

  targetCtx.drawImage(sourceCanvas, crop.x, crop.y, crop.size, crop.size, 0, 0, crop.size, crop.size);

  return {
    width: targetCanvas.width,
    height: targetCanvas.height,
    dataUrl: targetCanvas.toDataURL('image/png'),
  };
}

export async function normalizeImage(image: ProcessedImage, targetSize = 512): Promise<ProcessedImage> {
  const imageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = image.dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create normalization canvas context');
  }

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, targetSize, targetSize);

  const aspect = imageElement.naturalWidth / imageElement.naturalHeight;
  let drawWidth = targetSize;
  let drawHeight = targetSize;

  if (aspect > 1) {
    drawHeight = targetSize / aspect;
  } else {
    drawWidth = targetSize * aspect;
  }

  const offsetX = (targetSize - drawWidth) / 2;
  const offsetY = (targetSize - drawHeight) / 2;
  ctx.drawImage(imageElement, offsetX, offsetY, drawWidth, drawHeight);

  return {
    width: targetSize,
    height: targetSize,
    dataUrl: canvas.toDataURL('image/png'),
  };
}
