import React, { useCallback, useState } from "react";

type ProcessedImage = {
  id: string;
  name: string;
  url: string;
  originalName: string;
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
    // Es: IMG_4829.JPG
    const num = Math.floor(randomRange(1000, 9999));
    return `IMG_${num}.JPG`;
  } else if (type === "Android") {
    // Es: 20240301_142301.jpg
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    const HH = String(Math.floor(randomRange(8, 22))).padStart(2, '0');
    const mm = String(Math.floor(randomRange(0, 59))).padStart(2, '0');
    const ss = String(Math.floor(randomRange(0, 59))).padStart(2, '0');
    return `${YYYY}${MM}${DD}_${HH}${mm}${ss}.jpg`;
  } else {
    // Es: DSC01923.JPG
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
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // CROP CASUALE
        const cropX = w * randomRange(0.01, 0.03);
        const cropY = h * randomRange(0.01, 0.03);
        const cropW = w - (cropX * 2); 
        const cropH = h - (cropY * 2);

        const canvas = document.createElement("canvas");
        canvas.width = cropW;
        canvas.height = cropH;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas non supportato"));
          return;
        }

        // MICRO-ROTAZIONE E STRETCH
        const angle = randomRange(-1.5, 1.5) * (Math.PI / 180);
        ctx.save();
        ctx.translate(cropW / 2, cropH / 2);
        ctx.rotate(angle);
        ctx.scale(randomRange(0.99, 1.01), randomRange(0.99, 1.01));
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        // COLOR GRADING E RUMORE
        const imageData = ctx.getImageData(0, 0, cropW, cropH);
        const data = imageData.data;
        const rShift = randomRange(0.98, 1.02);
        const gShift = randomRange(0.98, 1.02);
        const bShift = randomRange(0.98, 1.02);
        
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 8; 
          data[i] = Math.min(255, Math.max(0, (data[i] * rShift) + noise));
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] * gShift) + noise));
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] * bShift) + noise));
        }
        ctx.putImageData(imageData, 0, 0);

        // COMPRESSIONE VARIABILE
        const variableQuality = randomRange(0.88, 0.95);

        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error("Errore generazione file"));
            else resolve(blob);
          },
          "image/jpeg",
          variableQuality
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
        });
      }
      setImages((prev) => [...prev, ...results]);
    } catch (e) {
      setError("Si è verificato un errore durante l'elaborazione.");
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

  // Funzione per salvare singola immagine (tap veloce)
  const downloadImage = (img: ProcessedImage) => {
    const a = document.createElement("a");
    a.href = img.url;
    a.download = img.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Funzione "Magica" per iOS: Condivisione Multipla
  const shareAllToGallery = async () => {
    if (images.length === 0) return;
    setSharing(true);
    setError(null);

    try {
      // 1. Convertiamo le URL blob in oggetti File reali
      const filesArray = await Promise.all(
        images.map(async (img) => {
          const response = await fetch(img.url);
          const blob = await response.blob();
          return new File([blob], img.name, { type: "image/jpeg" });
        })
      );

      // 2. Controlliamo se il browser supporta la condivisione di file
      if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        await navigator.share({
          files: filesArray,
          title: 'Foto Vinted',
          text: 'Ecco le tue foto pronte per Vinted!'
        });
      } else {
        throw new Error("Il tuo browser non supporta il salvataggio multiplo. Scarica le foto una ad una cliccandoci sopra.");
      }
    } catch (e) {
      // Se l'utente annulla o c'è un errore
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message || "Errore nel salvataggio. Prova a scaricarle singolarmente.");
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
        className="group bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-4 transition-all hover:border-blue-500/50 hover:bg-slate-50/50 cursor-pointer"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-slate-700">
            Carica foto
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Tocca qui per selezionare dalla libreria
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
           <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-xs font-medium text-slate-600 animate-pulse">
            Elaborazione anti-hash in corso...
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
                  Svuota
                </button>
             </div>
             
             <button
                type="button"
                onClick={shareAllToGallery}
                disabled={sharing}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all hover:bg-blue-500 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {sharing ? (
                  "Preparazione..."
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
                Si aprirà il menu condivisione. Scorri e scegli <strong>"Salva X Immagini"</strong>.
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
