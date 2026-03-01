import React from "react";
import ImageTransformer from "./components/ImageTransformer";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 pt-[env(safe-area-inset-top,0px)] pb-3">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
                Vinted-style Toolkit
              </p>
              <h1 className="text-xl font-semibold text-slate-900">
                Vinted Hash
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-md mx-auto px-4 py-4 pb-8 space-y-4">
          <p className="text-xs text-slate-500 px-1">
            Trasforma le immagini localmente per modificare la struttura dei
            pixel e rimuovere i metadati EXIF.
          </p>
          <ImageTransformer />
        </div>
      </main>
    </div>
  );
};

export default App;
