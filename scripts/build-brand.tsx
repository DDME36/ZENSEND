import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

async function main() {
  const source = 'public/zensend-z-horse.png';
  for (const [name, size] of [['icon.png',512],['icon-192.png',192],['icon-512.png',512],['apple-icon.png',180],['favicon-32.png',32],['favicon-16.png',16],['zensend-horse.png',512]] as const) {
    await sharp(source).resize(size,size).png().toFile(`public/${name}`);
  }
  await sharp(source).resize(350,350).extend({ top:81,bottom:81,left:81,right:81,background:{r:0,g:0,b:0,alpha:0} }).png().toFile('public/icon-maskable.png');
  const icons = await Promise.all([16,32,48].map(size => sharp(source).resize(size,size).png().toBuffer()));
  const header = Buffer.alloc(6 + icons.length * 16);
  header.writeUInt16LE(1,2); header.writeUInt16LE(icons.length,4);
  let offset = header.length;
  icons.forEach((png,index) => {
    const start=6+index*16; header[start]=[16,32,48][index]; header[start+1]=[16,32,48][index];
    header.writeUInt16LE(1,start+4); header.writeUInt16LE(32,start+6);
    header.writeUInt32LE(png.length,start+8); header.writeUInt32LE(offset,start+12); offset+=png.length;
  });
  await writeFile('public/favicon.ico',Buffer.concat([header,...icons]));
  const logo=(await readFile('public/icon-512.png')).toString('base64');
  await writeFile('public/icon.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${logo}"/></svg>`);
  const og=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111f"/><stop offset="1" stop-color="#101a35"/></linearGradient><linearGradient id="line"><stop stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><circle cx="170" cy="85" r="280" fill="#0ea5e9" opacity=".08"/><circle cx="1100" cy="570" r="360" fill="#6366f1" opacity=".09"/><path d="M70 505H1130" stroke="url(#line)" stroke-width="2" opacity=".42"/><image href="data:image/png;base64,${logo}" x="90" y="125" width="360" height="360"/><text x="500" y="268" fill="#f8fafc" font-family="Arial,sans-serif" font-weight="700" font-size="82">ZenSend</text><text x="505" y="330" fill="#bae6fd" font-family="Arial,sans-serif" font-size="28">Send files directly between devices</text><text x="505" y="385" fill="#94a3b8" font-family="Arial,sans-serif" font-size="22">Fast P2P transfer · No sign-up required</text><text x="505" y="472" fill="#64748b" font-family="Arial,sans-serif" font-size="17" letter-spacing="3">BY ZENTYR</text></svg>`;
  await sharp(Buffer.from(og)).png().toFile('public/og-image.png');
  for (const name of ['icon-192.png','icon-512.png','apple-icon.png','favicon-16.png','icon-maskable.png']) {
    const stats=await sharp(`public/${name}`).stats();
    if(stats.isOpaque) throw new Error(`${name} must have transparent pixels`);
    console.log(`${name}: alpha verified`);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
