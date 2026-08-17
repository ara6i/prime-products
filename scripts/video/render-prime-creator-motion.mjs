import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import sharp from 'sharp';

const W = 720;
const H = 1280;
const FPS = 30;

const C = {
  paper: '#fbfaf8',
  ink: '#101116',
  cobalt: '#2154ef',
  violet: '#6035f2',
  orange: '#ff8a00',
  lavender: '#f0edff',
  white: '#ffffff',
};

const outputDir = process.argv[2];
if (!outputDir) throw new Error('Usage: node render-prime-creator-motion.mjs <output-dir>');
await fs.mkdir(outputDir, { recursive: true });
const logoData = `data:image/png;base64,${(await fs.readFile(path.join(process.cwd(), 'public/media/partner-landing/primestyleai-new-mark.png'))).toString('base64')}`;

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const ease = (v) => {
  const t = clamp(v);
  return 1 - Math.pow(1 - t, 3);
};
const inOut = (v) => {
  const t = clamp(v);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function defs() {
  return `<defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.cobalt}"/>
      <stop offset="0.54" stop-color="${C.violet}"/>
      <stop offset="1" stop-color="${C.orange}"/>
    </linearGradient>
    <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6a6d78"/><stop offset="0.18" stop-color="#f8f8fb"/>
      <stop offset="0.42" stop-color="#9fa3ae"/><stop offset="0.70" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#767986"/>
    </linearGradient>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#2b2350" flood-opacity="0.16"/>
    </filter>
  </defs>`;
}

function text(x, y, value, size, options = {}) {
  const family = options.serif ? 'Georgia' : 'Helvetica Neue, Arial, sans-serif';
  const weight = options.weight ?? (options.serif ? 700 : 700);
  const anchor = options.anchor ?? 'middle';
  const fill = options.fill ?? C.ink;
  const tracking = options.tracking ?? 0;
  const style = options.italic ? 'italic' : 'normal';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" font-style="${style}" letter-spacing="${tracking}" fill="${fill}">${esc(value)}</text>`;
}

function pill(x, y, w, h, label, color, progress = 1) {
  const s = 0.82 + 0.18 * ease(progress);
  return `<g transform="translate(${x + w / 2} ${y + h / 2}) scale(${s}) translate(${-w / 2} ${-h / 2})" opacity="${clamp(progress * 1.8)}">
    <rect width="${w}" height="${h}" rx="${h / 2}" fill="${C.white}" stroke="${color}" stroke-width="3"/>
    <circle cx="${h / 2}" cy="${h / 2}" r="${h * 0.28}" fill="${color}"/>
    ${text(h / 2 + 24, h / 2 + 8, label, 25, { anchor: 'start', weight: 700, fill: C.ink, tracking: 0.4 })}
  </g>`;
}

function networkFrame(t) {
  const intro = ease(t / 0.45);
  const titleOut = 1 - ease((t - 1.65) / 0.35);
  const focus = ease((t - 1.50) / 0.55);
  const pulse = 1 + 0.035 * Math.sin(t * Math.PI * 3);
  const cx = 360;
  const cy = 650;
  const orbit = (radius, phase, r, c) => {
    const a = phase + t * 1.05;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius * 0.62;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="${c}" opacity="${intro}"/>`;
  };
  const curtain = 720 * (1 - intro);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <rect width="720" height="1280" fill="${C.paper}"/>
    <circle cx="95" cy="180" r="140" fill="${C.lavender}"/>
    <circle cx="690" cy="1040" r="230" fill="${C.lavender}" opacity="0.72"/>
    <g opacity="${titleOut}">
      ${text(58, 176, 'Shopping', 82, { anchor: 'start', serif: true, italic: true })}
      ${text(58, 264, 'Network.', 82, { anchor: 'start', serif: true, italic: true })}
      ${text(62, 329, 'CREATORS · LOOKS · MERCHANTS', 19, { anchor: 'start', weight: 700, tracking: 2.1, fill: C.cobalt })}
    </g>
    <g transform="translate(${cx} ${cy}) scale(${pulse}) translate(${-cx} ${-cy})">
      <circle cx="${cx}" cy="${cy}" r="180" fill="none" stroke="${C.cobalt}" stroke-width="2" opacity="0.18"/>
      <circle cx="${cx}" cy="${cy}" r="275" fill="none" stroke="${C.violet}" stroke-width="2" opacity="0.12"/>
      ${orbit(278, 0.25, 46, 'url(#g)')}
      ${orbit(278, 2.45, 28, C.orange)}
      ${orbit(190, 4.35, 34, C.cobalt)}
      <circle cx="${cx}" cy="${cy}" r="126" fill="url(#g)" filter="url(#shadow)"/>
      <circle cx="${cx}" cy="${cy}" r="104" fill="${C.paper}" opacity="0.97"/>
      ${text(cx, cy - 8, 'PRIME', 31, { weight: 800, tracking: 4, fill: C.cobalt })}
      ${text(cx, cy + 31, 'STYLE AI', 31, { weight: 800, tracking: 3, fill: C.ink })}
    </g>
    ${pill(58, 870, 260, 74, 'CREATORS', C.cobalt, (t - 0.20) / 0.35)}
    ${pill(400, 790, 252, 74, 'LOOKS', C.violet, (t - 0.40) / 0.35)}
    ${pill(245, 1018, 310, 74, 'MERCHANTS', C.orange, (t - 0.60) / 0.35)}
    <g opacity="${focus}" transform="translate(0 ${28 * (1 - focus)})">
      <rect x="54" y="102" width="612" height="212" rx="30" fill="${C.ink}"/>
      ${text(360, 186, 'PRIMESTYLEAI', 24, { weight: 800, tracking: 3.2, fill: C.orange })}
      ${text(360, 255, 'Shopping Network', 52, { serif: true, italic: true, fill: C.white })}
    </g>
    <rect x="0" y="0" width="${curtain}" height="1280" fill="${C.cobalt}"/>
  </svg>`;
}

function commissionFrame(t) {
  const numberIn = ease(t / 0.42);
  const details = ease((t - 0.55) / 0.45);
  const growth = ease((t - 2.50) / 0.48);
  const bar = clamp((t - 0.38) / 1.25);
  const numberY = 470 - 36 * numberIn;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <rect width="720" height="1280" fill="${C.paper}"/>
    <rect x="34" y="54" width="652" height="716" rx="42" fill="${C.lavender}"/>
    <rect x="34" y="54" width="652" height="116" rx="42" fill="${C.ink}"/>
    ${text(72, 119, 'CREATOR × MERCHANT', 22, { anchor: 'start', weight: 700, tracking: 2.4, fill: C.orange })}
    <g opacity="${numberIn}" transform="translate(0 ${44 * (1 - numberIn)})">
      ${text(360, numberY, '100%', 202, { weight: 800, fill: C.cobalt, tracking: -10 })}
    </g>
    <rect x="110" y="527" width="500" height="18" rx="9" fill="#d8d3ee"/>
    <rect x="110" y="527" width="${500 * inOut(bar)}" height="18" rx="9" fill="url(#g)"/>
    <g opacity="${details}">
      ${text(360, 620, 'OF THE COMMISSION', 35, { weight: 800, tracking: 1.4 })}
      ${text(360, 669, 'YOU AGREE ON', 35, { weight: 800, tracking: 1.4 })}
    </g>
    <g opacity="${growth}" transform="translate(0 ${36 * (1 - growth)})">
      <rect x="34" y="812" width="652" height="404" rx="42" fill="${C.white}" stroke="#e6e1f2" stroke-width="2"/>
      ${text(72, 886, 'BUILD YOUR', 21, { anchor: 'start', weight: 800, tracking: 2.8, fill: C.orange })}
      ${text(72, 958, 'creator presence', 59, { anchor: 'start', serif: true, italic: true })}
      ${text(72, 1014, 'and grow with the network.', 30, { anchor: 'start', weight: 650 })}
      <path d="M82 1140 C185 1106 262 1131 343 1068 C426 1004 499 1050 624 948" fill="none" stroke="url(#g)" stroke-width="12" stroke-linecap="round"/>
      <circle cx="82" cy="1140" r="16" fill="${C.cobalt}"/><circle cx="343" cy="1068" r="16" fill="${C.violet}"/><circle cx="624" cy="948" r="16" fill="${C.orange}"/>
    </g>
  </svg>`;
}

function discEnvironmentFrame(t) {
  const reveal = ease(t / 0.46);
  const drift = Math.sin(t * 0.72) * 18;
  const ring = 0.96 + 0.025 * Math.sin(t * 1.15);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <rect width="720" height="1280" fill="${C.paper}"/>
    <circle cx="${80 + drift}" cy="670" r="270" fill="${C.lavender}" opacity="0.88"/>
    <circle cx="${700 - drift}" cy="430" r="250" fill="url(#g)" opacity="0.12"/>
    <ellipse cx="360" cy="654" rx="330" ry="390" fill="none" stroke="url(#chrome)" stroke-width="18" opacity="0.58" transform="scale(${ring} 1) translate(${360 * (1 / ring - 1)} 0)"/>
    <g opacity="${reveal}" transform="translate(0 ${26 * (1 - reveal)})">
      ${text(360, 102, 'OUTFIT BUILDER', 21, { weight: 800, tracking: 3.8, fill: C.orange })}
      ${text(360, 174, 'Create shoppable looks.', 52, { serif: true, italic: true })}
      <rect x="42" y="1064" width="636" height="118" rx="59" fill="${C.ink}"/>
      ${text(360, 1138, 'AI TRY-ON  ·  STYLING  ·  PRODUCT VIDEO', 20, { weight: 700, tracking: 1.2, fill: C.white })}
    </g>
  </svg>`;
}

function endCardFrame(t) {
  const intro = ease(t / 0.24);
  const offset = 520 * (1 - intro);
  const cards = [
    { x: -44 + offset, y: 92, w: 230, h: 176, c: C.cobalt },
    { x: 214 + offset * 0.6, y: 92, w: 230, h: 176, c: C.lavender },
    { x: 472 + offset * 0.25, y: 92, w: 230, h: 176, c: C.orange },
    { x: -110 - offset * 0.4, y: 1010, w: 250, h: 168, c: C.orange },
    { x: 168 - offset * 0.7, y: 1010, w: 250, h: 168, c: C.violet },
    { x: 446 - offset, y: 1010, w: 250, h: 168, c: C.cobalt },
  ];
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <rect width="720" height="1280" fill="${C.paper}"/>
    ${cards.map((c, i) => `<g transform="translate(${c.x} ${c.y}) rotate(${i % 2 ? 2 : -2})"><rect width="${c.w}" height="${c.h}" rx="24" fill="${c.c}"/><circle cx="${c.w * 0.5}" cy="${c.h * 0.48}" r="42" fill="${i % 3 === 1 ? C.orange : C.paper}" opacity="0.9"/></g>`).join('')}
    <g opacity="${intro}" transform="translate(0 ${26 * (1 - intro)})">
      <rect x="284" y="379" width="152" height="152" rx="34" fill="${C.white}" filter="url(#shadow)"/>
      <image href="${logoData}" x="298" y="393" width="124" height="124" preserveAspectRatio="xMidYMid meet"/>
      ${text(360, 586, 'JOIN THE WAITLIST', 25, { weight: 800, tracking: 3.4, fill: C.orange })}
      ${text(360, 675, 'Join the', 66, { serif: true, italic: true })}
      ${text(360, 748, 'Shopping Network.', 61, { serif: true, italic: true })}
      ${text(360, 845, 'CREATORS.PRIMESTYLEAI.COM', 24, { weight: 800, tracking: 1.6, fill: C.cobalt })}
    </g>
  </svg>`;
}

const captionCues = [
  { start: 0.00, end: 0.84, lines: ['Fashion creators—'] },
  { start: 1.30, end: 3.34, lines: ['Ready to turn your influence', 'into opportunity?'] },
  { start: 3.80, end: 5.64, lines: ['Join the PrimeStyleAI', 'Shopping Network.'] },
  { start: 6.03, end: 7.05, lines: ['Create shoppable looks.'] },
  { start: 7.38, end: 9.99, lines: ['Showcase products with', 'AI-powered try-on and styling.'] },
  { start: 10.44, end: 11.74, lines: ['Connect directly with merchants.'] },
  { start: 12.14, end: 14.29, lines: ['Keep 100% of the commission', 'you agree on.'] },
  { start: 14.74, end: 16.72, lines: ['Build your creator presence', 'and grow with the network.'] },
  { start: 17.13, end: 20.30, lines: ['Join the waitlist', 'creators.PrimeStyleAI.com'] },
];

function captionFrame(t) {
  const cue = captionCues.find((item) => t >= item.start && t < item.end);
  if (!cue) return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"/>`;
  const lineHeight = 42;
  const h = cue.lines.length === 1 ? 72 : 116;
  const y = H - h - 54;
  const firstBaseline = y + (cue.lines.length === 1 ? 47 : 45);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="42" y="${y}" width="636" height="${h}" rx="${h / 2}" fill="${C.ink}" opacity="0.88"/>
    ${cue.lines.map((line, i) => text(360, firstBaseline + i * lineHeight, line, 31, { weight: 700, fill: C.white })).join('')}
  </svg>`;
}

async function render(name, seconds, makeSvg) {
  const output = path.join(outputDir, `${name}.mp4`);
  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(FPS), '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', output,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(seconds * FPS);
  for (let i = 0; i < frames; i += 1) {
    const png = await sharp(Buffer.from(makeSvg(i / FPS))).png().toBuffer();
    if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
  }
  ffmpeg.stdin.end();
  const [code] = await once(ffmpeg, 'close');
  if (code !== 0) throw new Error(`ffmpeg failed for ${name}: ${code}`);
  return output;
}

async function renderAlpha(name, seconds, makeSvg) {
  const output = path.join(outputDir, `${name}.mov`);
  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(FPS), '-i', '-',
    '-an', '-c:v', 'qtrle', '-pix_fmt', 'argb', output,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(seconds * FPS);
  for (let i = 0; i < frames; i += 1) {
    const png = await sharp(Buffer.from(makeSvg(i / FPS))).png().toBuffer();
    if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
  }
  ffmpeg.stdin.end();
  const [code] = await once(ffmpeg, 'close');
  if (code !== 0) throw new Error(`ffmpeg failed for ${name}: ${code}`);
  return output;
}

const rendered = [];
rendered.push(await render('scene-network-atomic', 2.60, networkFrame));
rendered.push(await render('scene-disc-environment', 6.05, discEnvironmentFrame));
rendered.push(await render('scene-commission-dynamic', 4.75, commissionFrame));
rendered.push(await render('scene-endcard-paper-carousel', 0.57, endCardFrame));
rendered.push(await renderAlpha('captions-overlay', 20.872, captionFrame));
console.log(rendered.join('\n'));
