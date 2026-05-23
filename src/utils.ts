export function compressImage(file: File, maxDimension = 1024, quality = 0.8): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Não foi possível inicializar o context do Canvas para compressão."));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Export always as image/jpeg for optimal compression and compatibility with Gemini
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          const base64Data = compressedDataUrl.replace(/^data:image\/(jpeg|png|jpg);base64,/, "");
          
          resolve({
            base64: base64Data,
            mimeType: "image/jpeg",
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        reject(new Error("Falha ao desenhar imagem. O arquivo pode estar corrompido ou em formato inválido."));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Falha ao ler o arquivo de imagem do disco."));
    };
    reader.readAsDataURL(file);
  });
}
