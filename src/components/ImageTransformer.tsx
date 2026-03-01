import React, { useCallback, useState } from "react";
import JSZip from "jszip";

type ProcessedImage = {
  id: string;
  name: string;
  url: string;
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

        // Semplice disegno dell'immagine originale sul canvas
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Impossibile generare JPEG"));
            } else {
              resolve(blob);
            }
          },
          "image/jpeg",
          0.92 // Qualità JPEG
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
  const [zipping, setZipping] = useState(false);

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
          name: file.name.replace(/\.[^.]+$/, "") + "-processed.jpg",
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

  const downloadAll = async () => {
    if (images.length === 0 || zipping) return;
    try {
      setZipping(true);
      const zip = new JSZip();
      const folder = zip.folder("immagini-elaborate");

      if (!folder) {
        throw new Error("Impossibile creare archivio ZIP");
      }

      await Promise.all(
        images.map(async (img) => {
          const response = await fetch(img.url);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          folder.file(img.name, arrayBuffer);
        })
      );

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "immagini.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message || "Errore nella creazione dello ZIP.");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="bg-white rounded-3xl shadow-sm p-4 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-3"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <p className="text-sm text-slate-600">Trascina qui le foto oppure</p>
        <label className="inline-flex items-center justify-center min-h-[44px] rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-pointer">
          Carica foto
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onInputChange}
          />
        </label>
      </div>

      {processing && (
        <p className="text-sm text-blue-600 font-medium px-1">
          Elaborazione in corso...
        </p>
      )}

      {error && <p className="text-sm text-red-500 px-1">{error}</p>}

      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <p className="text-sm font-medium text-slate-700">Immagini pronte</p>
            <button
              type="button"
              onClick={downloadAll}
              disabled={zipping}
              className="min-h-[36px] rounded-full px-4 text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
            >
              {zipping ? "Preparazione ZIP..." : "Scarica tutte (ZIP)"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {images.map((img) => (
              <div key={img.id} className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <img src={img.url} alt={img.name} className="w-full aspect-square object-cover" />
                <div className="p-2 flex flex-col gap-1">
                  <p className="text-[11px] text-slate-500 truncate">{img.name}</p>
                  <button
                    type="button"
                    onClick={() => downloadImage(img)}
                    className="min-h-[36px] rounded-2xl bg-blue-500 text-white text-xs font-semibold px-3 py-1"
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
