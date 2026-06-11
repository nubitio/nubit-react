import { useState, useCallback, useEffect } from 'react';

type Handle = () => void;

let handlers: Handle[] = [];

const xSmallMedia = window.matchMedia('(max-width: 575.98px)');
const smallMedia = window.matchMedia('(min-width: 576px) and (max-width: 991.98px)');
const mediumMedia = window.matchMedia('(min-width: 992px) and (max-width: 1199.98px)');
const largeMedia = window.matchMedia('(min-width: 1200px)');

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const notifyHandlers = () => {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    handlers.forEach((handler) => handler());
  }, 50);
};

[xSmallMedia, smallMedia, mediumMedia, largeMedia].forEach((media) => {
  media.addEventListener('change', (e) => {
    if (e.matches) notifyHandlers();
  });
});

const subscribe = (handler: Handle) => handlers.push(handler);
const unsubscribe = (handler: Handle) => {
  handlers = handlers.filter((item) => item !== handler);
};

function getScreenSize() {
  return {
    isXSmall: xSmallMedia.matches,
    isSmall: smallMedia.matches,
    isMedium: mediumMedia.matches,
    isLarge: largeMedia.matches,
  };
}

export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState(getScreenSize());
  const onSizeChanged = useCallback(() => setScreenSize(getScreenSize()), []);

  useEffect(() => {
    subscribe(onSizeChanged);
    return () => unsubscribe(onSizeChanged);
  }, [onSizeChanged]);

  return screenSize;
};

export const useScreenSizeClass = () => {
  const { isLarge, isMedium, isSmall } = useScreenSize();
  if (isLarge) return 'screen-large';
  if (isMedium) return 'screen-medium';
  if (isSmall) return 'screen-small';
  return 'screen-x-small';
};
