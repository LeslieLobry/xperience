"use client";

export default function AccueilReset() {
  return (
    <style jsx global>{`
    
      #accueil-scope, 
      #accueil-scope * , 
      #accueil-scope *::before, 
      #accueil-scope *::after {
        all: revert !important;
        box-sizing: border-box !important;
      }

     
      #accueil-scope {
        display: block !important;
        background: transparent !important; /* ton bg est géré par .accueil-page */
        color: inherit !important;
        font: inherit !important;
      }
    `}</style>
  );
}
