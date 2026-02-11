import React, { useEffect, useState } from "react";

const STORAGE_KEY = "smartCopyPhrases";

type Phrase = {
  id: string;
  text: string;
};

const loadPhrases = (): Phrase[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Phrase[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePhrases = (phrases: Phrase[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases));
  } catch {
    // ignore
  }
};

const SmartCopyManager: React.FC = () => {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [input, setInput] = useState("");
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    setPhrases(loadPhrases());
  }, []);

  useEffect(() => {
    savePhrases(phrases);
  }, [phrases]);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    const newPhrase: Phrase = { id: crypto.randomUUID(), text };
    setPhrases((prev) => [newPhrase, ...prev]);
    setInput("");
  };

  const handleDelete = (id: string) => {
    setPhrases((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCopy = async (phrase: Phrase) => {
    try {
      await navigator.clipboard.writeText(phrase.text);
      setCopyingId(phrase.id);
      setTimeout(() => setCopyingId((prev) => (prev === phrase.id ? null : prev)), 2000);
    } catch {
      // opzionale: mostrare un errore
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-sm p-4 flex gap-3 items-start">
        <textarea
          className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent min-h-[80px]"
          placeholder="Aggiungi una descrizione predefinita..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm active:bg-brand-dark disabled:opacity-40"
          disabled={!input.trim()}
        >
          Salva
        </button>
      </div>

      <div className="space-y-3">
        {phrases.length === 0 && (
          <p className="text-sm text-slate-500 px-1">
            Nessuna frase salvata. Aggiungine una per iniziare.
          </p>
        )}

        {phrases.map((phrase) => {
          const isCopied = copyingId === phrase.id;
          return (
            <div
              key={phrase.id}
              className="bg-white rounded-3xl shadow-sm px-4 py-3 flex flex-col gap-3"
            >
              <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">
                {phrase.text}
              </p>
              <div className="flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCopy(phrase)}
                  className={`flex-1 min-h-[44px] rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
                    isCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-900 text-slate-50 active:bg-slate-800"
                  }`}
                >
                  {isCopied ? "Copiato!" : "Copia"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(phrase.id)}
                  className="min-h-[44px] min-w-[44px] rounded-full border border-slate-200 text-slate-400 text-xs font-medium active:bg-slate-100"
                  aria-label="Elimina frase"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartCopyManager;

