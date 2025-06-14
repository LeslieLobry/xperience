import ReinitialiserClient from '../../components/ReinitialiserClient/ReinitialiserClient';
import { Suspense } from 'react';

export default function Page() {
  return (
  <Suspense fallback={<div>Chargement...</div>}>
  <ReinitialiserClient />;
  </Suspense>
  )
}
