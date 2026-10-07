import React from 'react';
import { useLoadingStore } from '../../store/loading.store';
import { LoadingScreen } from './LoadingScreen';

/**
 * GlobalLoader
 *
 * Mounts once at the app root. Reads the in-flight request count from
 * the loading store and renders a fullscreen LoadingScreen whenever any
 * Axios request is pending. Automatically hidden when count reaches 0.
 */
export const GlobalLoader: React.FC = () => {
  const count = useLoadingStore((s) => s.count);

  if (count === 0) return null;

  return <LoadingScreen fullscreen />;
};
