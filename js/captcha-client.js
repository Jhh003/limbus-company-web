/**
 * 客户端验证码生成
 * 无需服务器存储，减少KV使用量
 */

// 生成随机验证码
function generateCaptchaCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 生成验证码SVG图片
function generateCaptchaSVG(code) {
  const width = 120;
  const height = 44;
  const colors = ['#d4af37', '#f0d466', '#ff6b6b', '#4ecdc4'];
  const fontSize = 24;
  const startX = 15;
  const startY = 30;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="100%" height="100%" fill="rgba(10, 10, 10, 0.7)"/>`;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = startX + (i * 25);
    const y = startY + (Math.random() * 6 - 3);
    const rotation = (Math.random() * 30 - 15);
    const charColor = colors[Math.floor(Math.random() * colors.length)];
    
    svg += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold" fill="${charColor}" transform="rotate(${rotation}, ${x}, ${y})">${char}</text>`;
  }
  
  svg += `</svg>`;
  
  return svg;
}

// 生成Base64图片
function generateCaptchaImage(code) {
  const svg = generateCaptchaSVG(code);
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

// 导出函数
if (typeof window !== 'undefined') {
  window.CaptchaGenerator = {
    generateCode: generateCaptchaCode,
    generateSVG: generateCaptchaSVG,
    generateImage: generateCaptchaImage
  };
}
