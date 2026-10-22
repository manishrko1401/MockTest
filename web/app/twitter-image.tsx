import OpenGraphImage from './opengraph-image';

// X / Twitter uses the same picture as other link previews
export const alt = 'Mock Test Hub: mock tests, typing tests and exam notices';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return OpenGraphImage();
}
