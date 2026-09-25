"""CPU-only reference photo segmentation from Aiad's deployment/frontend.py.

Reads image bytes on stdin, returns a cleaned PNG body mask on stdout. No
training, dataset access, measurement labels, image persistence or cloud API.
"""
import io
import sys
import numpy as np
import cv2
from PIL import Image, ImageOps
from rembg import new_session, remove
from scipy import ndimage


def main():
    encoded = sys.stdin.buffer.read(15 * 1024 * 1024 + 1)
    if not encoded or len(encoded) > 15 * 1024 * 1024:
        raise ValueError("Image must be smaller than 15 MB")
    # Browser display and Aiad's cv2 photo loader honour phone EXIF rotation.
    # Keep the mask in that same displayed coordinate system; originals stay
    # untouched and no camera-angle or anatomical correction is inferred here.
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(encoded))).convert("RGB")
    if image.width * image.height > 25_000_000:
        raise ValueError("Image exceeds the 25 megapixel test limit")
    session = new_session("u2net_human_seg", providers=["CPUExecutionProvider"])
    alpha = np.asarray(remove(image, session=session, only_mask=True))
    if alpha.ndim == 3:
        alpha = alpha[..., 0]
    mask = (alpha > 127).astype(np.uint8)
    n, labels = cv2.connectedComponents(mask)
    if n > 1:
        sizes = np.bincount(labels.ravel())[1:]
        mask = (labels == 1 + int(np.argmax(sizes))).astype(np.uint8)
    mask = ndimage.binary_fill_holes(mask).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    out = io.BytesIO()
    Image.fromarray(mask * 255).save(out, format="PNG")
    sys.stdout.buffer.write(out.getvalue())


if __name__ == "__main__":
    main()
