import React, { useCallback, useState } from "react";

type ProcessedImage = {
  id: string;
  name: string;
  url: string;
  originalName: string;
  blob: Blob; // Salviamo il blob direttamente per evitare riconversioni
};

// Genera un numero casuale in un range specifico
const randomRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

// Genera un nome file che sembra scattato da un iPhone o Android
const generateHumanFilename = () => {
  const types = ["iOS", "Android", "DSLR"];
  const type = types[Math.floor(Math.random() * types.length)];
  const date = new Date();
  
  if (type === "iOS") {
    const num = Math.floor(randomRange(1000, 9999));
    return `IMG_${num}.JPG`;
  } else if (type === "Android") {
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    const HH = String(Math.floor(randomRange(8, 22))).padStart(2, '0');
    const mm = String(Math.floor(randomRange(0, 59))).padStart(2, '0');
    const ss = String(Math.floor(randomRange(0, 59))).padStart(2, '0');
    return `${YYYY}${MM}${DD}_${HH}${mm}${ss}.jpg`;
  } else {
    const num = Math.floor(randomRange(100, 9999));
    return `DSC0${num}.JPG`;
  }
};

const processFile = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // LIMITATORE DI RISOLUZIONE
        // Se la foto è gigantesca (es. 4000px), Vinted potrebbe fallire il processing.
        // La ridimensioniamo a una misura standard da smartphone (max 2500px).
        let w = img.naturalWidth;
        let h = img.naturalHeight;
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

        // CROP DI SICUREZZA (Minimo, per non perdere contenuto)
        const cropX = w * 0.01;
        const cropY = h * 0.01;
        const cropW = w - (cropX * 2); 
        const cropH = h - (cropY * 2);

        const canvas = document.createElement("canvas");
        canvas.width = cropW;
        canvas.height = cropH;
        
        const ctx = canvas.getContext("2d", { alpha: false }); // Disabilita canale alpha per forzare JPEG puro
        if (!ctx) {
          reject(new Error("Canvas non supportato"));
          return;
        }

        // 1. RIEMPI DI BIANCO (Fix per foto che "spariscono")
        // Se c'è trasparenza, diventa bianca e non nera (che viene bannata)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, cropW, cropH);

        // 2. MICRO-ROTAZIONE E STRETCH (Meno aggressivo di prima)
        // Riduciamo i valori per evitare che il file sembri corrotto
        const angle = randomRange(-0.8, 0.8) * (Math.PI / 180);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high'; // Massima qualità
        
        ctx.save();
        ctx.translate(cropW / 2, cropH / 2);
        ctx.rotate(angle);
        ctx.scale(randomRange(0.995, 1.005), randomRange(0.995, 1.005));
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        // 3. COLOR GRADING (Imperceptibile ma matematico)
        const imageData = ctx.getImageData(0, 0, cropW, cropH);
        const data = imageData.data;
        const rShift = randomRange(0.99, 1.01);
        const gShift = randomRange(0.99, 1.01);
        const bShift = randomRange(0.99, 1.01);
        
        for (let i = 0; i < data.length; i += 4) {
          // Rumore ridotto: valori troppo alti corrompono la qualità visiva
          const noise = (Math.random() - 0.5) * 4; 
          data[i] = Math.min(255, Math.max(0, (data[i] * rShift) + noise));
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] * gShift) + noise));
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] * bShift) + noise));
        }
        ctx.putImageData(imageData, 0, 0);

        // 4. QUALITÀ STANDARD (Fondamentale per Vinted)
        // Non scendere sotto 0.92. Se il file è troppo compresso, il server lo scarta.
        const safeQuality = randomRange(0.93, 0.98);

        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error("Errore generazione file"));
            else resolve(blob);
          },
          "image/jpeg",
          safeQuality
        );
      };
      img.onerror = () => reject(new Error("File immagine non valido"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Errore lettura file"));
    reader.readAsDataURL(file);
  });
};

const ImageTransformer: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [sharing, setSharing] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setProcessing(true);
    try {
      const results: ProcessedImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const blob = await processFile(file);
        const url = URL.createObjectURL(blob);
        const humanName = generateHumanFilename();
        results.push({
          id: crypto.randomUUID(),
          name: humanName,
          originalName: file.name,
          url,
          blob // Conserviamo il blob
        });
      }
      setImages((prev) => [...prev, ...results]);
    } catch (e) {
      setError("Errore: alcune immagini non sono supportate.");
    } finally {
      setProcessing(false);
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    void handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const downloadImage = (img: ProcessedImage) => {
    const a = document.createElement("a");
    a.href = img.url;
    a.download = img.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Funzione CONDIVISIONE corretta con METADATI TEMPORALI
  const shareAllToGallery = async () => {
    if (images.length === 0) return;
    setSharing(true);
    setError(null);

    try {
      // Creiamo File Objects completi con data di modifica aggiornata
      // Questo è cruciale: se manca la data, Vinted a volte rifiuta il file.
      const filesArray = images.map((img) => {
        return new File([img.blob], img.name, { 
            type: "image/jpeg",
            lastModified: new Date().getTime() // Data di "scatto" = ADESSO
        });
      });

      if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        await navigator.share({
          files: filesArray,
        });
      } else {
        throw new Error("Browser non compatibile. Scarica singolarmente.");
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError("Impossibile salvare automaticamente. Usa il tasto scarica su ogni foto.");
      }
    } finally {
      setSharing(false);
    }
  };

  const clearImages = () => {
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div
        className="group bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-4 transition-all hover:border-indigo-500/50 hover:bg-slate-50/50 cursor-pointer"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-slate-700">
            Carica foto da pulire
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Tocca qui per aprire la galleria
          </p>
        </div>
        
        <input
          id="file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {processing && (
        <div className="flex flex-col items-center justify-center py-6 space-y-3">
           <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-xs font-medium text-slate-600 animate-pulse">
            Rigenerazione file in corso...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs border border-red-100 font-medium">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-5">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {images.length} Foto pronte
                </span>
                <button
                  onClick={clearImages}
                  className="text-xs text-slate-400 font-medium px-2 py-1"
                >
                  Ricomincia
                </button>
             </div>
             
             <button
                type="button"
                onClick={shareAllToGallery}
                disabled={sharing}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-lg shadow-slate-900/20 active:scale-95 transition-all hover:bg-slate-800 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {sharing ? (
                  "Apro la condivisione..."
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03l2.955-3.129v8.614z" />
                      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                    </svg>
                    Salva tutte in Galleria
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-400">
                Seleziona <strong>"Salva X Immagini"</strong> dal menu che appare.
              </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group"
                onClick={() => downloadImage(img)}
              >
                <div className="aspect-square w-full bg-slate-100">
                  <img
                    src={img.url}
                    alt="processed"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Badge "Human Name" */}
                <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur py-1 px-2 border-t border-slate-100">
                   <p className="text-[10px] font-mono font-bold text-center text-slate-600 truncate">
                    {img.name}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageTransformer;
