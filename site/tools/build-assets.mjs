// Renders brand images, icons, a QR code and the printable flyer from HTML templates.
// Needs Playwright with Chromium available (npx playwright install chromium, if not present).
//   npm run assets
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const img = join(root, 'assets/img');
mkdirSync(img, { recursive: true });

const logo = readFileSync(join(root, 'assets/logo.svg'), 'utf8');
const qrSvg = await QRCode.toString('https://idid.care', { type: 'svg', margin: 1, color: { dark: '#34312c', light: '#fffaf2' }, errorCorrectionLevel: 'M' });
await QRCode.toFile(join(img, 'qr.png'), 'https://idid.care', { width: 600, margin: 2, color: { dark: '#34312c', light: '#fffaf2' }, errorCorrectionLevel: 'M' });

const base = `
  *{box-sizing:border-box;margin:0}
  body{font-family:ui-rounded,'SF Pro Rounded','Nunito',system-ui,sans-serif;color:#34312c;background:#f5efe6;-webkit-font-smoothing:antialiased}
  .serif{font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;font-weight:500}
  .logo svg{width:100%;height:100%}
  .leafbg{position:absolute;border-radius:50%;background:#dfe8e0}
`;
const T = {
  og: { w: 1200, h: 630, html: `<style>${base}</style><div style="position:relative;width:1200px;height:630px;padding:72px 80px;overflow:hidden;background:#f5efe6">
    <div class="leafbg" style="width:560px;height:560px;right:-120px;top:-80px"></div><div class="leafbg" style="width:260px;height:260px;right:280px;bottom:-140px;background:#e3e7f0"></div>
    <div style="display:flex;align-items:center;gap:18px"><div class="logo" style="width:72px;height:72px">${logo}</div><b style="font-size:40px;letter-spacing:.04em">iDID</b></div>
    <h1 class="serif" style="font-size:68px;line-height:1.08;margin-top:52px;max-width:780px;position:relative">A quiet place to notice what happens, and what helps.</h1>
    <p style="font-size:28px;color:#6f675d;margin-top:28px;position:relative">Private journal for dissociation &amp; trauma · idid.care</p></div>` },
  postNotice: { w: 1080, h: 1080, html: `<style>${base}</style><div style="position:relative;width:1080px;height:1080px;padding:96px;overflow:hidden;background:#f5efe6;display:flex;flex-direction:column">
    <div class="leafbg" style="width:700px;height:700px;right:-260px;top:-260px"></div>
    <div class="logo" style="width:110px;height:110px;position:relative">${logo}</div>
    <h1 class="serif" style="font-size:96px;line-height:1.05;margin-top:auto;position:relative">A quiet place to notice what happens, and what helps.</h1>
    <p style="font-size:36px;color:#6f675d;margin-top:40px">iDID · free, private journal · <b style="color:#5d7f6f">idid.care</b></p></div>` },
  postPrivate: { w: 1080, h: 1080, html: `<style>${base}</style><div style="position:relative;width:1080px;height:1080px;padding:96px;overflow:hidden;background:#1d2024;color:#e8e2d8;display:flex;flex-direction:column">
    <div class="leafbg" style="width:640px;height:640px;left:-220px;bottom:-260px;background:#33433c"></div>
    <div style="display:flex;align-items:center;gap:22px;position:relative"><div class="logo" style="width:96px;height:96px">${logo}</div><b style="font-size:48px;letter-spacing:.04em">iDID</b></div>
    <h1 class="serif" style="font-size:118px;line-height:1.02;margin-top:120px;position:relative">Your story stays yours.</h1>
    <p style="font-size:40px;line-height:1.4;color:#c9c2b6;margin-top:48px;position:relative;max-width:820px">Encrypted on your device. End-to-end encrypted with your circle. No ads, no trackers.</p>
    <p style="font-size:36px;margin-top:auto;color:#93b2a2;position:relative"><b>idid.care</b></p></div>` },
  postKindness: { w: 1080, h: 1080, html: `<style>${base}</style><div style="position:relative;width:1080px;height:1080px;padding:96px;overflow:hidden;background:#f3e4d4;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
    <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#a7794f" stroke-width="1.4" stroke-linecap="round"><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    <p style="font-size:34px;letter-spacing:.14em;text-transform:uppercase;color:#a7794f;margin-top:48px;font-weight:700">A kind note for you</p>
    <h1 class="serif" style="font-size:100px;line-height:1.08;margin-top:28px">"Someone out here is rooting for you today."</h1>
    <p style="font-size:36px;color:#6f675d;margin-top:56px">Kindness, passed along · <b style="color:#5d7f6f">idid.care</b></p></div>` },
  story: { w: 1080, h: 1920, html: `<style>${base}</style><div style="position:relative;width:1080px;height:1920px;padding:120px 96px;overflow:hidden;background:#f5efe6;display:flex;flex-direction:column;align-items:center;text-align:center">
    <div class="leafbg" style="width:900px;height:900px;left:90px;top:-420px"></div>
    <div class="logo" style="width:150px;height:150px;position:relative;margin-top:60px">${logo}</div>
    <b style="font-size:64px;letter-spacing:.06em;margin-top:24px;position:relative">iDID</b>
    <p class="serif" style="font-size:40px;color:#5d7f6f;font-style:italic;margin-top:12px">I did. I noticed. I made it through.</p>
    <h1 class="serif" style="font-size:96px;line-height:1.08;margin-top:120px">A gentle journal for dissociation &amp; trauma, and the people who care.</h1>
    <div style="margin-top:auto;width:420px;height:420px;background:#fffaf2;border-radius:40px;padding:30px">${qrSvg}</div>
    <p style="font-size:46px;margin-top:40px;color:#5d7f6f"><b>idid.care</b></p>
    <p style="font-size:30px;color:#6f675d;margin-top:10px">Free · Private · No ads</p></div>` },
  logo1024: { w: 1024, h: 1024, html: `<style>${base}body{background:transparent}</style><div class="logo" style="width:1024px;height:1024px">${logo}</div>`, transparent: true },
  wordmark: { w: 1600, h: 500, html: `<style>${base}body{background:transparent}</style><div style="width:1600px;height:500px;display:flex;align-items:center;justify-content:center;gap:56px"><div class="logo" style="width:300px;height:300px">${logo}</div><b style="font-size:240px;letter-spacing:.04em;color:#34312c">iDID</b></div>`, transparent: true },
};
const icon = (size) => ({ w: size, h: size, html: `<style>*{margin:0}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><rect width="64" height="64" fill="#dfe8e0"/><path d="M18 46c0-16 10-26 30-28-2 20-12 30-28 30M18 46c6-8 12-13 18-16" fill="none" stroke="#5d7f6f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>` });
const files = { og: 'og-image.png', postNotice: 'post-notice.png', postPrivate: 'post-private.png', postKindness: 'post-kindness.png', story: 'story.png', logo1024: 'logo-1024.png', wordmark: 'wordmark.png' };

const b = await chromium.launch();
for (const [k, t] of [...Object.entries(T), ['i180', icon(180)], ['i192', icon(192)], ['i512', icon(512)]]) {
  const p = await b.newPage({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1 });
  await p.setContent(t.html);
  const name = files[k] ?? `icon-${k.slice(1)}.png`;
  await p.screenshot({ path: join(img, name), omitBackground: !!t.transparent });
  await p.close();
}

// Printable flyer (US Letter)
const flyer = await b.newPage({ viewport: { width: 816, height: 1056 } });
await flyer.setContent(`<style>${base}
  @page{size:Letter;margin:0} body{width:8.5in;height:11in;background:#f5efe6}
  .f{position:relative;width:8.5in;height:11in;padding:.75in;overflow:hidden;display:flex;flex-direction:column}
  li{margin:.09in 0;font-size:14pt;line-height:1.32}
</style><div class="f">
  <div class="leafbg" style="width:6in;height:6in;right:-2.2in;top:-2.2in"></div>
  <div style="display:flex;align-items:center;gap:.18in;position:relative"><div class="logo" style="width:.9in;height:.9in">${logo}</div><b style="font-size:30pt;letter-spacing:.04em">iDID</b></div>
  <p class="serif" style="font-style:italic;color:#5d7f6f;font-size:15pt;margin-top:.12in;position:relative">I did. I noticed. I made it through.</p>
  <h1 class="serif" style="font-size:34pt;line-height:1.08;margin-top:.35in;max-width:6.3in;position:relative">A gentle journal for dissociation, trauma responses, and the people who care.</h1>
  <ul style="margin-top:.3in;padding-left:.25in;max-width:6.6in">
    <li><b>Note what happens in a few taps</b>: when, where, triggers, mood, parts present, lost time.</li>
    <li><b>Share with your trust circle</b>: family and friends can add what they noticed.</li>
    <li><b>See patterns</b> and bring a clear summary to your therapist.</li>
    <li><b>Find support near you</b>, plus calming tools for hard moments.</li>
    <li><b>Private by design</b>: encrypted on your device. No ads, no trackers.</li>
  </ul>
  <div style="margin-top:auto;display:flex;align-items:center;gap:.4in;background:#fffaf2;border-radius:.3in;padding:.3in">
    <div style="width:1.7in;height:1.7in;flex-shrink:0">${qrSvg}</div>
    <div><p style="font-size:14pt;color:#6f675d">Scan or visit</p><p style="font-size:34pt;color:#5d7f6f"><b>idid.care</b></p><p style="font-size:14pt;margin-top:.08in">Free on any phone or computer.</p></div>
  </div>
  <p style="font-size:10pt;color:#6f675d;margin-top:.18in;line-height:1.4">iDID is a journaling and support tool, not a medical device. In a crisis in the US, call or text 988. In an emergency, call 911.</p>
</div>`);
await flyer.pdf({ path: join(root, 'press/flyer.pdf'), format: 'Letter', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await flyer.screenshot({ path: join(img, 'flyer-preview.png') });
await b.close();

// The app uses the same PNG icons for its manifest and home-screen icon.
for (const s of ['180', '192', '512']) copyFileSync(join(img, `icon-${s}.png`), resolve(root, `../app/public/icon-${s}.png`));
writeFileSync(join(img, 'README.txt'), 'Generated by `npm run assets` in site/. Edit tools/build-assets.mjs, not these files.\n');
console.log('Assets written to site/assets/img and site/press/flyer.pdf');
