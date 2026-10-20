"""Builds the app icon source and the installer images from the Mock Test Hub logo.

    python branding/make_branding.py   (run from desktop/, then: npm run icons)

Inputs:  branding/logo.png (2048x2048, blue trophy + "MockTest Hub" on white)
Outputs: app-icon.png                 1024x1024 trophy on transparent (source for `tauri icon`)
         branding/nsis-sidebar.bmp    164x314  welcome / finish page panel (full logo)
         branding/nsis-header.bmp     150x57   header of the other installer pages
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BLUE = (60, 96, 206)                      # trophy colour in the logo
TROPHY_BOX = (642, 514, 1461, 1331)        # trophy, without the text
LOGO_BOX = (564, 514, 1549, 1747)          # trophy + "MockTest Hub"
TEXT_BOX = (564, 1350, 1549, 1747)         # "MockTest Hub" only

logo = Image.open(HERE / 'logo.png').convert('RGBA')
flat = Image.new('RGB', logo.size, 'white')
flat.paste(logo, mask=logo.split()[3])     # logo on solid white


def trophy_transparent(size: int, fill: float = 0.86) -> Image.Image:
    """The trophy in the logo blue on a transparent background (alpha from how far each
    pixel is from white, so the anti-aliased edges stay smooth)."""
    crop = flat.crop(TROPHY_BOX)
    out = Image.new('RGBA', crop.size)
    src, dst = crop.load(), out.load()
    for y in range(crop.height):
        for x in range(crop.width):
            g = src[x, y][1]
            a = max(0.0, min(1.0, (255 - g) / (255 - BLUE[1])))
            dst[x, y] = (*BLUE, round(a * 255))
    inner = round(size * fill)
    scale = inner / max(out.size)
    out = out.resize((round(out.width * scale), round(out.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(out, ((size - out.width) // 2, (size - out.height) // 2), out)
    return canvas


def fit(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    scale = min(max_w / img.width, max_h / img.height)
    return img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)


# App / installer icon source
trophy_transparent(1024).save(ROOT / 'app-icon.png')

# Welcome / finish page panel: full logo on white
sidebar = Image.new('RGB', (164, 314), 'white')
full = fit(flat.crop(LOGO_BOX), 128, 170)
sidebar.paste(full, ((164 - full.width) // 2, (314 - full.height) // 2))
sidebar.save(HERE / 'nsis-sidebar.bmp')

# Header of the other pages: trophy + name side by side
header = Image.new('RGB', (150, 57), 'white')
trophy = fit(flat.crop(TROPHY_BOX), 44, 44)
text = fit(flat.crop(TEXT_BOX), 92, 40)
x = (150 - (trophy.width + 6 + text.width)) // 2
header.paste(trophy, (x, (57 - trophy.height) // 2))
header.paste(text, (x + trophy.width + 6, (57 - text.height) // 2))
header.save(HERE / 'nsis-header.bmp')

print('ok')
