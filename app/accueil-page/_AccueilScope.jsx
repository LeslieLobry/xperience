"use client";

export default function AccueilScope({ children }) {
  return (
    <div id="accueil-scope">
      <style jsx global>{`
        /* Neutralise les styles extérieurs UNIQUEMENT dans #accueil-scope */
        #accueil-scope, #accueil-scope * , #accueil-scope *::before, #accueil-scope *::after {
          all: revert-layer;
        }
        /* Fallback si revert-layer non supporté */
        @supports not (all: revert-layer) {
          #accueil-scope, #accueil-scope * , #accueil-scope *::before, #accueil-scope *::after {
            all: unset;
            box-sizing: border-box;
          }
          #accueil-scope { display: block; }
          #accueil-scope * { display: revert; }
        }
      `}</style>
      {children}
    </div>
  );
}
