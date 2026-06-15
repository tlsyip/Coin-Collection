import { log } from '../logging';

export type ProcessedImage = {
  width: number;
  height: number;
  dataUrl: string;
};

export async function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  log('IMAGE LOAD START');
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = async () => {
      log(`IMAGE LOAD SUCCESS (${image.naturalWidth}x${image.naturalHeight})`);
      if (typeof image.decode === 'function') {
        try {
          log('IMAGE DECODE START');
          await image.decode();
          log('IMAGE DECODE SUCCESS');
        } catch (decodeError) {
          log(`IMAGE LOAD WARNING: decode failed (${String(decodeError)})`);
        }
      }
      resolve(image);
    };

    image.onerror = () => {
      log('IMAGE LOAD FAILED');
      reject(new Error('Image failed to load'));
    };

    image.src = dataUrl;
  });
}

export async function processCoinImage(dataUrl: string): Promise<ProcessedImage> {
  log('IMAGE PROCESS START');
  try {
    const image = await loadImageElement(dataUrl);
    const cropped = await detectAndCropCoin(image);
    const normalized = await normalizeImage(cropped);
    log('IMAGE PROCESS SUCCESS');
    return normalized;
  } catch (error) {
    log(`IMAGE PROCESSING ERROR: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function createImageCanvas(image: HTMLImageElement, maxDimension = 1024) {
  log('RESIZE START');
  const aspect = image.naturalWidth / image.naturalHeight;
  const width = image.naturalWidth > image.naturalHeight ? maxDimension : Math.round(maxDimension * aspect);
  const height = image.naturalHeight >= image.naturalWidth ? maxDimension : Math.round(maxDimension / aspect);
  const scale = width / image.naturalWidth;

  log(`RESIZE SCALE: ${scale.toFixed(3)}`);
  log(`CANVAS SIZE: ${width}x${height}`);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    log('CANVAS CONTEXT ERROR');
    throw new Error('Unable to create canvas context');
  }

  log('DRAW IMAGE START');
  ctx.drawImage(image, 0, 0, width, height);
  log('DRAW IMAGE SUCCESS');
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
    log('CANVAS CONTEXT ERROR');
    throw new Error('Unable to get canvas context');
  }

  log('PIXEL EXTRACTION START');
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    log(`PIXEL EXTRACTION SUCCESS (${imageData.width * imageData.height} pixels)`);
  } catch (error) {
    log(`PIXEL EXTRACTION FAILED: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }

  const bounds = findCoinBounds(imageData);
  if (bounds) {
    log('COIN BOUND DETECTED');
  } else {
    log('COIN BOUND DETECTION FALLBACK');
  }

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
    log('CANVAS CONTEXT ERROR');
    throw new Error('Unable to create target canvas context');
  }

  log('DRAW IMAGE START');
  targetCtx.drawImage(sourceCanvas, crop.x, crop.y, crop.size, crop.size, 0, 0, crop.size, crop.size);
  log('DRAW IMAGE SUCCESS');

  return {
    width: targetCanvas.width,
    height: targetCanvas.height,
    dataUrl: targetCanvas.toDataURL('image/png'),
  };
}

export async function normalizeImage(image: ProcessedImage, targetSize = 512): Promise<ProcessedImage> {
  log('NORMALIZE IMAGE START');

  const imageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => {
      log('IMAGE LOAD FAILED');
      reject(error);
    };
    img.src = image.dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    log('CANVAS CONTEXT ERROR');
    throw new Error('Unable to create normalization canvas context');
  }

  log(`CANVAS SIZE: ${targetSize}x${targetSize}`);
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
  log('DRAW IMAGE START');
  ctx.drawImage(imageElement, offsetX, offsetY, drawWidth, drawHeight);
  log('DRAW IMAGE SUCCESS');

  return {
    width: targetSize,
    height: targetSize,
    dataUrl: canvas.toDataURL('image/png'),
  };
}
