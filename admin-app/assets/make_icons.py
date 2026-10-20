"""Builds the admin app's icons from the desktop app's trophy (desktop/app-icon.png).

    python assets/make_icons.py   (run from admin-app/)

Outputs (in assets/):
  icon.png                       1024  white trophy on navy, with an "ADMIN" tag
  android-icon-foreground.png    1024  white trophy + tag on transparent (adaptive icon)
  android-icon-background.png    1024  navy
  android-icon-monochrome.png    1024  trophy silhouette (themed icons)
  notification-icon.png          96    white silhouette on transparent (status bar)
  splash-icon.png                512   white trophy on transparent
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
NAVY = (30, 78, 121)
AMBER = (245, 158, 11)
trophy = Image.open(HERE.parent.parent / 'desktop' / 'app-icon.png').convert('RGBA')
# Solid shape: the source alpha is speckled, so it is thresholded and lightly smoothed
alpha = trophy.split()[3].filter(ImageFilter.MaxFilter(5)).point(lambda a: 255 if a > 60 else 0).filter(ImageFilter.GaussianBlur(1.2))


def white_trophy(size: int, fill: float) -> Image.Image:
    t = Image.new('RGBA', trophy.size, (255, 255, 255, 0))
    t.putalpha(alpha)
    white = Image.new('RGBA', trophy.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    inner = round(size * fill)
    white = white.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(white, ((size - inner) // 2, (size - inner) // 2 - round(size * 0.04)), white)
    return canvas


def font(px: int):
    for name in ('arialbd.ttf', 'segoeuib.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default()


def tag(img: Image.Image, size: int, scale: float):
    d = ImageDraw.Draw(img)
    f = font(round(size * 0.085 * scale))
    text = 'ADMIN'
    w = d.textlength(text, font=f)
    h = round(size * 0.12 * scale)
    pad = round(size * 0.035 * scale)
    x0 = (size - w) / 2 - pad
    y0 = size * (0.5 + 0.27 * scale)
    d.rounded_rectangle((x0, y0, x0 + w + pad * 2, y0 + h), radius=h / 2, fill=AMBER)
    d.text((size / 2, y0 + h / 2), text, font=f, fill=(255, 255, 255), anchor='mm')


# Launcher icon (legacy / Play listing)
icon = Image.new('RGBA', (1024, 1024), NAVY + (255,))
icon.alpha_composite(white_trophy(1024, 0.56))
tag(icon, 1024, 1.0)
icon.save(HERE / 'icon.png')

# Adaptive icon: content inside the 66% safe zone
fg = white_trophy(1024, 0.40)
tag(fg, 1024, 0.72)
fg.save(HERE / 'android-icon-foreground.png')
Image.new('RGBA', (1024, 1024), NAVY + (255,)).save(HERE / 'android-icon-background.png')
white_trophy(1024, 0.40).save(HERE / 'android-icon-monochrome.png')

# Status-bar icon: must be white on transparent
white_trophy(96, 0.84).save(HERE / 'notification-icon.png')
white_trophy(512, 0.7).save(HERE / 'splash-icon.png')
print('icons written')
