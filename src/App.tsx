import React, { useState } from "react";
import SmartCopyManager from "./components/SmartCopyManager";
import ImageTransformer from "./components/ImageTransformer";

type TabId = "copy" | "images";

const App: React.FC = () => {
  const [tab, setTab] = useState<TabId>("copy");

  const isCopy = tab === "copy";

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

          <nav className="bg-slate-100 rounded-2xl p-1 flex gap-1">
            <button
              type="button"
              onClick={() => setTab("copy")}
              className={`flex-1 min-h-[44px] rounded-2xl text-xs font-semibold transition-colors ${
                isCopy
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Smart Copy
            </button>
            <button
              type="button"
              onClick={() => setTab("images")}
              className={`flex-1 min-h-[44px] rounded-2xl text-xs font-semibold transition-colors ${
                !isCopy
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Image Transformer
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-md mx-auto px-4 py-4 pb-8 space-y-4">
          {isCopy ? (
            <>
              <p className="text-xs text-slate-500 px-1">
                Gestisci descrizioni predefinite per velocizzare la
                pubblicazione degli annunci.
              </p>
              <SmartCopyManager />
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 px-1">
                Trasforma le immagini localmente per modificare la struttura
                dei pixel e rimuovere i metadati EXIF.
              </p>
              <ImageTransformer />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

