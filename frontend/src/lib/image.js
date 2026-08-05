// Read an image File and return a resized base64 data URL (square-cropped, max 400x400)
export const readImageAsDataUrl = (file, maxSize = 400) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('Arquivo inválido. Envie uma imagem.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Imagem muito grande (máx 8MB).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao carregar a imagem.'));
      img.onload = () => {
        try {
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          const canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};
