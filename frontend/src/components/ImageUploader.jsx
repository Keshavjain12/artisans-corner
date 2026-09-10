import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadService } from '../services/vendorService.js';

const MAX_IMAGES = 6;

/**
 * Uploads straight to the API (which streams to Cloudinary) and keeps only the
 * returned URLs in form state. Supports preview, reorder and remove.
 */
export function ImageUploader({ images = [], onChange, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const files = [...fileList].slice(0, MAX_IMAGES - images.length);
    if (files.length === 0) {
      toast.error(`You can upload up to ${MAX_IMAGES} images`);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadService.productImages(files, setProgress);
      onChange([...images, ...res.data.images]);
      toast.success(`${res.data.images.length} image(s) uploaded`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (index, direction) => {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((image, index) => (
          <figure
            key={image.url}
            className="group relative aspect-square overflow-hidden rounded-xl border border-sand bg-sand"
          >
            <img src={image.url} alt={image.alt || `Product image ${index + 1}`} className="h-full w-full object-cover" />
            {index === 0 && (
              <figcaption className="absolute left-1.5 top-1.5 rounded-full bg-ink/75 px-2 py-0.5 text-[10px] font-medium text-white">
                Cover
              </figcaption>
            )}
            <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={() => move(index, -1)}
                className="rounded-lg bg-white/90 p-1 text-ink hover:bg-white"
                aria-label={`Move image ${index + 1} earlier`}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                className="rounded-lg bg-white/90 p-1 text-ink hover:bg-white"
                aria-label={`Move image ${index + 1} later`}
              >
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onChange(images.filter((_, i) => i !== index))}
              className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1 text-red-600 hover:bg-white"
              aria-label={`Remove image ${index + 1}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </figure>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-clay-300 bg-clay-50/50 text-xs text-clay-700 transition-colors hover:border-clay-500 hover:bg-clay-50 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>{progress}%</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                <span>Add image</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        className="sr-only"
        onChange={(event) => event.target.files?.length && handleFiles(event.target.files)}
      />
      <p className="mt-2 text-xs text-ink-soft">
        JPG, PNG, WEBP or AVIF up to 5MB each. The first image is used as the cover.
      </p>
    </div>
  );
}

export default ImageUploader;
