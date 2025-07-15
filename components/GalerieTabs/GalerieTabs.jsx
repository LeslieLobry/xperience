'use client';

import { useState } from 'react';
import GaleriePhotos from '../GaleriePubliquePhotos/GaleriePubliquePhotos';
import GaleriePriveePhotos from '../GaleriePriveePhotos/GaleriePriveePhotos';
import Button from '../Button/Button';
import "./GalerieTabs.css";

export default function GaleriesTabs({ publicPhotos, galeriePrivee, editable, utilisateurId, visiteurId  }) {
  const [activeTab, setActiveTab] = useState('publique'); // ou 'privee'

  return (
    <div className="galeries-tabs">
      
      <h3 className="profil-section-title">Galerie</h3>
      <div className="tabs-buttons">
        <button
          className={activeTab === 'publique' ? 'active' : ''}
          onClick={() => setActiveTab('publique')}
        >
         Galerie publique
        </button>
        <button
          className={activeTab === 'privee' ? 'active' : ''}
          onClick={() => setActiveTab('privee')}
        >
          Galerie privée
        </button>
      </div>

      <div className="tabs-content">
        {activeTab === 'publique' && (
          <GaleriePhotos photos={publicPhotos} editable={editable} />
        )}

        {activeTab === 'privee' && (
          <GaleriePriveePhotos
            editable={editable}
            utilisateurId={utilisateurId}
            visiteurId={visiteurId}
          />
        )}
      </div>
    </div>
  );
}
