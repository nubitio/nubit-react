import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767.98px)';

const getIsMobile = () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

/**
 * True below the tablet breakpoint (768px). The grid switches from the table
 * layout to the card list, and popovers become bottom sheets.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(media.matches);
    media.addEventListener('change', onChange);
    onChange();

    return () => media.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
