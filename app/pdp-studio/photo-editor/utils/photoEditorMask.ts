import type {
  MaskStroke,
  PhotoEditorImageDimensions,
} from "../types/photoEditor";

const MAX_MASK_EDGE = 2048;

export async function readPhotoEditorImageDimensions(
  file: File,
): Promise<PhotoEditorImageDimensions> {
  const image = await createImageBitmap(file);
  const dimensions = {
    width: image.width,
    height: image.height,
  };
  image.close();
  return dimensions;
}

export async function createRetouchMaskFile(input: {
  strokes: MaskStroke[];
  dimensions: PhotoEditorImageDimensions;
}): Promise<File> {
  const { width, height } = constrainDimensions(input.dimensions);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser could not prepare the retouch mask.");
  }

  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#ffffff";
  context.fillStyle = "#ffffff";
  context.lineCap = "round";
  context.lineJoin = "round";

  input.strokes
    .filter((stroke) => stroke.mode === "retouch")
    .forEach((stroke) => paintMaskStroke(context, stroke, width, height));

  const blob = await canvasToBlob(canvas);
  return new File([blob], "retouch-mask.png", { type: "image/png" });
}

function paintMaskStroke(
  context: CanvasRenderingContext2D,
  stroke: MaskStroke,
  width: number,
  height: number,
): void {
  const firstPoint = stroke.points[0];
  if (!firstPoint) return;

  const brushWidth = Math.max(1, stroke.sizeRatio * width);
  context.lineWidth = brushWidth;
  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(
      firstPoint.x * width,
      firstPoint.y * height,
      brushWidth / 2,
      0,
      Math.PI * 2,
    );
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(firstPoint.x * width, firstPoint.y * height);
  stroke.points.slice(1).forEach((point) => {
    context.lineTo(point.x * width, point.y * height);
  });
  context.stroke();
}

function constrainDimensions(
  dimensions: PhotoEditorImageDimensions,
): PhotoEditorImageDimensions {
  const longestEdge = Math.max(dimensions.width, dimensions.height);
  if (longestEdge <= MAX_MASK_EDGE) return dimensions;
  const scale = MAX_MASK_EDGE / longestEdge;
  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("The retouch mask could not be created."));
    }, "image/png");
  });
}
