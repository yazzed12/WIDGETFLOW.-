import React from 'react';
import { authenticatedBinaryRequest } from '../../services/httpClient';

type AuthenticatedAssetImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  onAssetError?: () => void;
};

export const AuthenticatedAssetImage: React.FC<AuthenticatedAssetImageProps> = ({ src, onAssetError, ...props }) => {
  const [assetState, setAssetState] = React.useState<{
    src: string;
    objectUrl: string | null;
    failed: boolean;
  } | null>(null);
  const protectedAsset = src.startsWith('/api/assets/');

  React.useEffect(() => {
    let disposed = false;
    let nextObjectUrl: string | null = null;
    if (!protectedAsset) return () => undefined;
    void authenticatedBinaryRequest(src)
      .then(({ blob }) => {
        if (disposed) return;
        nextObjectUrl = URL.createObjectURL(blob);
        setAssetState({ src, objectUrl: nextObjectUrl, failed: false });
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setAssetState({ src, objectUrl: null, failed: true });
        onAssetError?.();
        if (import.meta.env.DEV) {
          const diagnostic = error as { code?: string; statusCode?: number };
          console.warn('[ASSET IMAGE LOAD]', { code: diagnostic?.code, statusCode: diagnostic?.statusCode });
        }
      });
    return () => {
      disposed = true;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [onAssetError, protectedAsset, src]);

  if (!protectedAsset) return <img src={src} alt={props.alt ?? ''} {...props} />;
  const currentAssetState = assetState?.src === src ? assetState : null;
  if (currentAssetState?.failed || !currentAssetState?.objectUrl) return null;
  return <img src={currentAssetState.objectUrl} alt={props.alt ?? ''} {...props} />;
};
