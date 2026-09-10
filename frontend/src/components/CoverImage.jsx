import cn from '../utils/cn.js';

/**
 * An image that degrades to a tinted monogram instead of a broken-image icon.
 *
 * Store logos and banners are optional at onboarding, so a brand new shop has
 * empty strings for both. Rendering `<img src="">` shows the browser's broken
 * image glyph, which makes a working shop look defective.
 */
export function CoverImage({ src, alt = '', label = '', className, imgClassName, ...props }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(className, imgClassName)}
        {...props}
      />
    );
  }

  return (
    <span
      aria-hidden={alt ? undefined : 'true'}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      className={cn(
        'flex items-center justify-center bg-gradient-to-br from-clay-100 to-sand',
        className
      )}
    >
      <span className="font-display text-lg text-clay-500">
        {(label || alt).trim().charAt(0).toUpperCase() || '·'}
      </span>
    </span>
  );
}

export default CoverImage;
