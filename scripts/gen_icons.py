"""Generate minimal valid PWA icons using stdlib only (no Pillow required)."""
import zlib
import struct
import os


def make_solid_png(filename: str, width: int, height: int, r: int, g: int, b: int) -> None:
    def chunk(name: bytes, data: bytes) -> bytes:
        c = zlib.crc32(name + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    # IHDR: width, height, bit_depth=8, color_type=2 (RGB), compression=0, filter=0, interlace=0
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    # IDAT: raw scanlines, filter byte 0 per row
    row = bytes([0]) + bytes([r, g, b] * width)  # filter byte + RGB pixels
    raw = row * height
    idat = chunk(b'IDAT', zlib.compress(raw))

    # IEND
    iend = chunk(b'IEND', b'')

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend)


make_solid_png('public/icons/icon-192.png', 192, 192, 0xB2, 0x22, 0x22)
make_solid_png('public/icons/icon-512.png', 512, 512, 0xB2, 0x22, 0x22)
print("Icons created.")
