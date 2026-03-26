// 生成PWA图标
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// 创建Phemex风格SVG模板
const createSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="phemexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00d4aa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00f5a0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#0a0a0a" rx="80"/>
  <path d="M160 120 L160 280 L200 280 L200 200 L280 200 L280 160 L160 160 Z" fill="url(#phemexGradient)"/>
  <path d="M240 240 L240 400 L280 400 L280 320 L360 320 L360 280 L240 280 Z" fill="url(#phemexGradient)"/>
</svg>`;

// 确保目录存在
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 保存SVG文件（浏览器会自动渲染）
sizes.forEach(size => {
  const svgContent = createSVG(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svgContent);
});

console.log('Phemex icons generated successfully!');