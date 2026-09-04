import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Artisan's Corner` : "Artisan's Corner";
  }, [title]);
}

export default useDocumentTitle;
