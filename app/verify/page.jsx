
import { Suspense } from 'react';
import VerifyClient from '../../components/VerifyClient/VerifyClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Chargement de la vérification...</div>}>
      <VerifyClient />
    </Suspense>
  );
}
