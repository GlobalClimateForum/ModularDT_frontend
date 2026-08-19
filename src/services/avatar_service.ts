import { Style, Avatar } from '@dicebear/core'
import { useSettings } from '@/globals/settings'

import glyphs from '@dicebear/styles/glyphs.json' with { type: 'json' };
import icons from '@dicebear/styles/icons.json' with { type: 'json' };
import shapes from '@dicebear/styles/shapes.json' with { type: 'json' };
import initials from '@dicebear/styles/initials.json' with { type: 'json' };
import identicon from '@dicebear/styles/identicon.json' with { type: 'json' };
import pixelArt from '@dicebear/styles/pixel-art.json' with { type: 'json' };
import notionists from '@dicebear/styles/notionists.json' with { type: 'json' };

const styleDefs = {
  glyphs, icons, shapes, initials, identicon,
  'pixel-art': pixelArt,
  notionists,
} as const;

export type StyleName = keyof typeof styleDefs;

export const styleNames = Object.keys(styleDefs) as StyleName[];

export function makeStyle(name: StyleName) {
  return new Style(styleDefs[name]);
}

export function avatarUri(style: Style<object>, seed: string, size = 88) {
  const s = (seed ?? '').toLowerCase().trim().replace(/\s+/g, '') || 'preview';
  return new Avatar(style, { seed: s, size }).toDataUri();
}

const previewCache = new Map<StyleName, string>();

export function previewUri(name: StyleName, size = 32) {
  const key = `${name}-${size}` as StyleName;
  if (!previewCache.has(key)) {
    previewCache.set(
      key,
      new Avatar(makeStyle(name), { seed: 'preview', size }).toDataUri()
    );
  }
  return previewCache.get(key)!;
}

export function changeAvatarStyleSetting(style: StyleName) {
  const settings = useSettings(); 
  settings.value.avatar_style = style;
}

export function prettyName(name: string) {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}