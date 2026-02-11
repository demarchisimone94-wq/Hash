import React, { useCallback, useState } from "react";

type ProcessedImage = {
  id: string;
  name: string;
  url: string;
};

const randomAngle = () => {
  const min = -0.5;
  const max = 0.5;
  return (Math.random() * (max - min) + min) * (Math.PI / 180);
};

const processFile = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas non supportato"));
          return;
        }

        const angle = randomAngle();
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(angle);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        // micro-crop 1% dai bordi
        const cropX = w * 0.01;
        const cropY = h * 0.01;
        const cropW = w * 0.98;
        const cropH = h * 0.98;

        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        if (!cropCtx) {
          reject(new Error("Canvas non supportato"));
          return;
        }
        cropCtx.drawImage(
          canvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          cropW,
          cropH
        );

        cropCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Impossibile generare JPEG"));
            } else {
              resolve(blob);
            }
          },
          "image/jpeg",
          0.92
        );
      };
      img.onerror = () => reject(new Error("Immagine non valida"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Errore di lettura file"));
    reader.readAsDataURL(file);
  });
};

const ImageTransformer: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ProcessedImage[]>([]);

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
        results.push({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, "") + "-vh.jpg",
          url
        });
      }
      setImages(results);
    } catch (e) {
      setError((e as Error).message || "Errore durante l'elaborazione");
    } finally {
      setProcessing(false);
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files);
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

  const downloadAll = () => {
    images.forEach((img, index) => {
      setTimeout(() => downloadImage(img), index * 200);
    });
  };

  return (
    <div className="space-y-4">
      <div
        className="bg-white rounded-3xl shadow-sm p-4 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-3"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <p className="text-sm text-slate-600">
          Trascina qui le foto oppure
        </p>
        <label className="inline-flex items-center justify-center min-h-[44px] rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm active:bg-brand-dark cursor-pointer">
          Carica foto
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onInputChange}
          />
        </label>
        <p className="text-[11px] text-slate-400">
          Tutto avviene sul tuo dispositivo. Niente upload su server esterni.
        </p>
      </div>

      {processing && (
        <p className="text-sm text-brand font-medium px-1">
          Elaborazione in corso, attendi qualche secondo...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 px-1">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <p className="text-sm font-medium text-slate-700">
              Immagini elaborate
            </p>
            <button
              type="button"
              onClick={downloadAll}
              className="min-h-[36px] rounded-full px-4 text-xs font-semibold bg-slate-900 text-white active:bg-slate-800"
            >
              Scarica tutte
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-2 flex flex-col gap-1">
                  <p className="text-[11px] text-slate-500 truncate">
                    {img.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadImage(img)}
                    className="min-h-[36px] rounded-2xl bg-brand/90 text-white text-xs font-semibold px-3 py-1 active:bg-brand-dark"
                  >
                    Scarica
                  </button>
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

