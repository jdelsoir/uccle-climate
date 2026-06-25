"""Generate maskable PWA icons: warming stripes + rising white trend line."""
from PIL import Image, ImageDraw

RAMP = [
    (69, 117, 180), (90, 140, 194), (116, 173, 209), (158, 201, 226), (198, 224, 236),
    (231, 241, 243), (255, 247, 214), (255, 233, 168), (253, 207, 135), (251, 178, 103),
    (247, 144, 80), (239, 109, 67), (226, 74, 53), (209, 47, 39), (184, 33, 31), (158, 1, 66),
]

def make(size: int, out: str) -> None:
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    n = len(RAMP)
    for i, c in enumerate(RAMP):
        x0 = round(i * size / n)
        x1 = round((i + 1) * size / n)
        d.rectangle([x0, 0, x1, size], fill=c)
    # Rising trend line, kept inside the maskable safe zone (~10–90%).
    pts = [(0.16, 0.78), (0.40, 0.60), (0.62, 0.46), (0.84, 0.22)]
    px = [(x * size, y * size) for x, y in pts]
    lw = max(2, round(size * 0.06))
    d.line([(x + lw * 0.18, y + lw * 0.18) for x, y in px], fill=(0, 0, 0), width=lw, joint="curve")
    d.line(px, fill=(255, 255, 255), width=lw, joint="curve")
    r = lw * 0.75
    cx, cy = px[-1]
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255))
    img.save(out)

if __name__ == "__main__":
    make(512, "public/icons/icon-512.png")
    make(192, "public/icons/icon-192.png")
    print("icons written")
