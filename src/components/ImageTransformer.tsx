import React, { useCallback, useState } from "react";

type ProcessedImage = {
  id: string;
  name: string;
  url: string;
  originalName: string;
  file: File;
};

// Generatore di nomi file "Umani" (es. img_5421.jpg, dsc_412.jpg)
const generateHumanFilename = () => {
  const types = ["ios", "android", "dslr"];
  const type = types[Math.floor(Math.random() * types.length)];
  const date = new Date();
  
  if (type === "ios") {
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `img_${num}.jpg`;
  } else if (type === "android") {
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `panc_${YYYY}${MM}${DD}_${HH}${mm}.jpg`;
  } else {
    const num = Math.floor(Math.random() * 9000) + 100;
    return `dsc_${num}.jpg`;
  }
};

const processFile = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        
        // 1. Limite risoluzione per evitare timeout
        const maxDim = 2500; 
        if (w > maxDim || h > maxDim) {
          const ratio = w / h;
          if (w > h) {
            w = maxDim;
            h = maxDim / ratio;
          } else {
            h = maxDim;
            w = maxDim * ratio;
          }
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return reject(new Error("Canvas error"));

        canvas.width = w;
        canvas.height = h;

        // Migliora la qualità del ridimensionamento
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // 2. Sfondo (non sarà visibile grazie allo zoom)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);

        // 3. Logica Anti-Ban (Hash Regeneration)
        ctx.save();
        ctx.translate(w / 2, h / 2);

        // Applichiamo distorsione e rotazione
        const skewX = (Math.random() - 0.5) * 0.012;
        const skewY = (Math.random() - 0.5) * 0.012;
        const angle = (Math.random() - 0.5) * 0.015;
        
        // FIX: Usiamo uno scale > 1 (Zoom In) per eliminare i bordi bianchi
        const scale = 1.05; 

        ctx.transform(scale, skewX, skewY, scale, 0, 0);
        ctx.rotate(angle);

        // Disegniamo l'immagine centrata
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        // 4. Esportazione (rimuove EXIF e rigenera i pixel)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const fileName = generateHumanFilename();
              const processedFile = new File([blob], fileName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(processedFile);
            } else {
              reject(new Error("Blob null"));
            }
          },
          "image/jpeg",
          0.92 // Qualità bilanciata per caricamenti veloci
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const ImageTransformer: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setProcessing(true);
    setError(null);

    try {
      const newImages: ProcessedImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const processedFile = await processFile(file);
        newImages.push({
          id: crypto.randomUUID(),
          name: processedFile.name,
          url: URL.createObjectURL(processedFile),
          originalName: file.name,
          file: processedFile,
        });
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (e) {
      setError("Errore durante l'elaborazione.");
    } finally {
      setProcessing(false);
    }
  }, []);

  const saveToGallery = async () => {
    if (images.length === 0) return;
    const filesToShare = images.map(img => img.file);

    if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
      try {
        await navigator.share({ files: filesToShare });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError("Usa il download singolo.");
      }
    } else {
      setError("Browser non supportato per il salvataggio multiplo.");
    }
  };

  const clear = () => {
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 font-sans">
      <div 
        onClick={() => document.getElementById('file-upload')?.click()}
        className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
      >
        <input 
          id="file-upload"
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-slate-600 font-bold">Carica Foto Anti-Ban</p>
        <p className="text-xs text-slate-400 mt-1">L'hash verrà rigenerato con zoom correttivo</p>
      </div>

      {processing && <p className="text-center text-xs animate-pulse text-indigo-600">Elaborazione pixel in corso...</p>}
      {error && <p className="text-center text-xs text-red-500">{error}</p>}

      {images.length > 0 && (
        <div className="space-y-4">
          <button 
            onClick={saveToGallery}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
          >
            Salva tutte in Galleria
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200">
                <img src={img.url} alt="processed" className="aspect-square object-cover w-full h-full" />
                <div className="absolute bottom-0 w-full bg-black/60 text-white p-1 text-[9px] text-center truncate">
                  {img.name}
                </div>
              </div>
            ))}
          </div>
          
          <button onClick={clear} className="w-full text-xs text-slate-400 py-2">Pulisci lista</button>
        </div>
      )}
    </div>
  );
};

export default ImageTransformer;
