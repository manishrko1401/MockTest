"""Builds the app icon source and the installer images from the Mock Test Hub logo.

    python branding/make_branding.py   (run from desktop/, then: npm run icons)

Inputs:  branding/logo.png (2048x2048, blue trophy + "MockTest Hub" on white)
         ../android-app/assets/icon.png (the Android app's icon: white trophy on brand blue)
Outputs: app-icon.png                 1024x1024 the Android app's icon cut to a circle (source for `tauri icon`)
         branding/nsis-sidebar.bmp    164x314  welcome / finish page panel (full logo)
         branding/nsis-header.bmp     150x57   header of the other installer pages
"""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TROPHY_BOX = (642, 514, 1461, 1331)        # trophy, without the text
LOGO_BOX = (564, 514, 1549, 1747)          # trophy + "MockTest Hub"
TEXT_BOX = (564, 1350, 1549, 1747)         # "MockTest Hub" only

logo = Image.open(HERE / 'logo.png').convert('RGBA')
flat = Image.new('RGB', logo.size, 'white')
flat.paste(logo, mask=logo.split()[3])     # logo on solid white


def fit(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    scale = min(max_w / img.width, max_h / img.height)
    return img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)


# App / installer icon source: the Android app's icon (white trophy on brand blue) as a circle,
# transparent outside. The circle is drawn 4x larger and scaled down for a smooth edge.
def circle_icon(size: int = 1024) -> Image.Image:
    art = Image.open(ROOT.parent / 'android-app' / 'assets' / 'icon.png').convert('RGBA').resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(art, (0, 0), mask.resize((size, size), Image.LANCZOS))
    return out


circle_icon().save(ROOT / 'app-icon.png')

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
