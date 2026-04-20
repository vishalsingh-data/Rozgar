'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ImagePlus, X, CheckCircle2, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ImageUploadProps {
  bucket: string;
  path: string;
  onUpload: (url: string) => void;
  optional?: boolean;
  label?: string;
}

type UploadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compress an image File via the Canvas API.
 * Max width: 800 px. JPEG quality: 0.8.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_WIDTH = 800;
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context unavailable'));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null'));
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ImageUpload({
  bucket,
  path,
  onUpload,
  optional = false,
  label = 'Add a photo',
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── File selection handler ─────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setProgress(0);

    try {
      // 1. Compress
      setState('compressing');
      setProgress(10);
      const compressed = await compressImage(file);
      setProgress(30);

      // Local preview from compressed blob
      const localPreview = URL.createObjectURL(compressed);
      setPreviewUrl(localPreview);

      // 2. Upload
      setState('uploading');

      // Unique filename: path/timestamp-random.jpg
      const filename = `${path}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

      // Supabase Storage doesn't expose real-time XHR progress, so we
      // simulate a smooth progress fill while waiting for the response.
      const simulateInterval = simulateProgress(30, 90, setProgress);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, compressed, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      clearInterval(simulateInterval);

      if (uploadError) throw uploadError;

      setProgress(95);

      // 3. Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      const publicUrl = data.publicUrl;

      setProgress(100);
      setState('done');
      onUpload(publicUrl);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      setPreviewUrl(null);
    } finally {
      // Reset input so the same file can be re-selected after an error
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleReset() {
    setState('idle');
    setPreviewUrl(null);
    setProgress(0);
    setErrorMsg(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-3">
      {/* Label */}
      {label && (
        <p className="text-sm font-medium text-foreground">
          {label}
          {optional && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          )}
        </p>
      )}

      {/* Preview */}
      {previewUrl && state === 'done' ? (
        <div className="relative w-full overflow-hidden rounded-xl border border-border">
          <div className="relative aspect-video w-full">
            <Image
              src={previewUrl}
              alt="Upload preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          {/* Success badge */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            Uploaded
          </div>

          {/* Remove / retake */}
          <button
            type="button"
            onClick={handleReset}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
            aria-label="Remove photo"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        /* Upload area */
        <div
          className={[
            'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors',
            state === 'error'
              ? 'border-destructive bg-destructive/5'
              : 'border-border bg-muted/30',
          ].join(' ')}
        >
          {state === 'idle' || state === 'error' ? (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <ImagePlus className="size-6 text-muted-foreground" />
              </div>

              {errorMsg && (
                <p className="text-center text-sm text-destructive">
                  {errorMsg}
                </p>
              )}

              {/* Hidden native input — accepts camera and gallery */}
              <input
                ref={fileInputRef}
                id="image-upload-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleFileChange}
              />

              <div className="flex w-full flex-col gap-2 sm:flex-row">
                {/* Take photo (camera on mobile) */}
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="size-4" />
                  Take Photo
                </Button>

                {/* Pick from gallery — separate input without capture */}
                <GalleryInput onFileSelected={handleFileChange} />
              </div>
            </>
          ) : (
            /* Progress state */
            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                {state === 'compressing' ? (
                  <ImagePlus className="size-6 animate-pulse text-primary" />
                ) : (
                  <Camera className="size-6 animate-pulse text-primary" />
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {state === 'compressing' ? 'Compressing…' : 'Uploading…'}
              </p>

              <div className="w-full space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-right text-xs text-muted-foreground">
                  {progress}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skip button */}
      {optional && state !== 'done' && state !== 'uploading' && state !== 'compressing' && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => onUpload('')}
        >
          <SkipForward className="size-4" />
          Skip for now
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GalleryInput — separate input without `capture` so it opens the file picker
// ─────────────────────────────────────────────────────────────────────────────

function GalleryInput({
  onFileSelected,
}: {
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={ref}
        id="gallery-input"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onFileSelected}
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="flex-1"
        onClick={() => ref.current?.click()}
      >
        <ImagePlus className="size-4" />
        From Gallery
      </Button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulate smooth progress between `from` and `to` over ~2 s
// ─────────────────────────────────────────────────────────────────────────────

function simulateProgress(
  from: number,
  to: number,
  setProgress: (v: number) => void
): ReturnType<typeof setInterval> {
  let current = from;
  const step = (to - from) / 20;

  return setInterval(() => {
    current = Math.min(current + step, to);
    setProgress(Math.round(current));
  }, 100);
}
