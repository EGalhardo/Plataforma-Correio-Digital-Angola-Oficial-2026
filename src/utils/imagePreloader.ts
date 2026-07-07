/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HIGHLIGHT_SLIDES, GOV_HIGHLIGHT_SLIDES, INST_HIGHLIGHT_SLIDES } from '../constants/data';

// Singleton registry for keeping preloaded Image elements in memory.
// Keeping the HTMLImageElement reference prevents the browser from garbage-collecting
// the decoded texture buffer, ensuring 0ms layout rendering when used in <img> tags.
const imageCacheRegistry = new Map<string, HTMLImageElement>();
const failedUrls = new Set<string>();

export interface PreloadProgress {
  total: number;
  loaded: number;
  failed: number;
  progressPercentage: number;
  isCompleted: boolean;
}

export interface PreloaderStats {
  isPreloading: boolean;
  progress: PreloadProgress;
  errors: string[];
}

let currentStats: PreloaderStats = {
  isPreloading: false,
  progress: {
    total: 0,
    loaded: 0,
    failed: 0,
    progressPercentage: 0,
    isCompleted: false,
  },
  errors: [],
};

// Listeners for progress updates in case components want to subscribe
const listeners = new Set<(stats: PreloaderStats) => void>();

function notifyListeners() {
  listeners.forEach(listener => {
    try {
      listener({ ...currentStats });
    } catch (e) {
      console.error('[ImagePreloader] Error in progress listener:', e);
    }
  });
}

/**
 * Extracts and returns all unique advertising image URLs from the slide configurations.
 */
export function getAdvertisingImageUrls(): string[] {
  const urls = new Set<string>();

  // Use optional chaining and type assertions to safe-guard against structure variations
  const addUrl = (url: any) => {
    if (typeof url === 'string' && url.trim().length > 0) {
      urls.add(url.trim());
    }
  };

  // 1. Sistema Utilizador (HIGHLIGHT_SLIDES)
  if (Array.isArray(HIGHLIGHT_SLIDES)) {
    HIGHLIGHT_SLIDES.forEach(slide => {
      if (slide) {
        addUrl(slide.image);
        addUrl(slide.mobileImage);
      }
    });
  }

  // 2. Sistema Administração (GOV_HIGHLIGHT_SLIDES)
  if (Array.isArray(GOV_HIGHLIGHT_SLIDES)) {
    GOV_HIGHLIGHT_SLIDES.forEach(slide => {
      if (slide) {
        addUrl(slide.image);
        addUrl(slide.mobileImage);
      }
    });
  }

  // 3. Sistema Instituição (INST_HIGHLIGHT_SLIDES)
  if (Array.isArray(INST_HIGHLIGHT_SLIDES)) {
    INST_HIGHLIGHT_SLIDES.forEach(slide => {
      if (slide) {
        addUrl(slide.image);
        addUrl(slide.mobileImage);
      }
    });
  }

  return Array.from(urls);
}

/**
 * Checks if the browser supports the WebP image format.
 * This function returns a promise that resolves to true or false.
 */
export function checkWebpSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(false);
      return;
    }
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      try {
        resolve(canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0);
      } catch (e) {
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
}

/**
 * Preloads a single image URL and registers it in the cache registry.
 * Reuses existing cached image elements if present.
 */
export function preloadSingleImage(url: string, optimizeWebp: boolean = false): Promise<HTMLImageElement> {
  // If already in memory cache, return it immediately
  if (imageCacheRegistry.has(url)) {
    return Promise.resolve(imageCacheRegistry.get(url)!);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Preloading is only supported in browser environment'));
      return;
    }

    const img = new Image();
    
    // Check if we can utilize an optimized image endpoint or format
    let targetUrl = url;
    if (optimizeWebp && url.includes('postimg.cc') && !url.endsWith('.webp')) {
      // If the cloud image host supports webp conversions or if we have webp options:
      // Note: PostImg direct URLs usually do not have simple extension rewrites,
      // but in a custom system, we could replace .png/.jpg with .webp if hosted accordingly.
      // For general reliability, we keep the target URL but we set fetch priority or attributes if supported.
    }

    // Modern browsers performance optimizations
    img.decoding = 'async';
    // Prevent cross-origin referrer leakage and optimize headers
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      failedUrls.delete(url); // Ensure it's removed from failed list upon successful load/retry
      imageCacheRegistry.set(url, img);
      resolve(img);
    };

    img.onerror = (event) => {
      failedUrls.add(url);
      reject(new Error(`Failed to load advertising image at ${url}`));
    };

    // Trigger the load
    img.src = targetUrl;
  });
}

/**
 * Initiates the background, silent preloading of all advertising images.
 * Does not block the main application flow.
 */
export async function startImagePreloading(): Promise<void> {
  if (currentStats.isPreloading) {
    return; // Already preloading
  }

  const urls = getAdvertisingImageUrls();
  if (urls.length === 0) {
    return;
  }

  currentStats = {
    isPreloading: true,
    progress: {
      total: urls.length,
      loaded: 0,
      failed: 0,
      progressPercentage: 0,
      isCompleted: false,
    },
    errors: [],
  };
  notifyListeners();

  // Determine WebP capabilities to optimize the pipeline
  const isWebpSupported = await checkWebpSupport();
  console.log(`[ImagePreloader] Starting preload of ${urls.length} images. WebP support: ${isWebpSupported}`);

  // We process preloads asynchronously and non-blocking.
  // To avoid saturating the network thread instantly, we throttle slightly or execute in safe parallel batches.
  const batchSize = 4;
  const queue = [...urls];

  const processQueue = async () => {
    while (queue.length > 0) {
      const batch = queue.splice(0, batchSize);
      
      const promises = batch.map(async (url) => {
        try {
          await preloadSingleImage(url, isWebpSupported);
          currentStats.progress.loaded += 1;
        } catch (err: any) {
          currentStats.progress.failed += 1;
          const msg = err.message || Error(err).message;
          currentStats.errors.push(msg);
          console.error(`[ImagePreloader] Internal error preloading ${url}: ${msg}`);
        } finally {
          // Calculate overall progress percentage
          const processed = currentStats.progress.loaded + currentStats.progress.failed;
          currentStats.progress.progressPercentage = Math.round(
            (processed / currentStats.progress.total) * 100
          );
          notifyListeners();
        }
      });

      // Await batch completion, allowing the microtask queue to run in between batches to remain silent & responsive.
      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    currentStats.isPreloading = false;
    currentStats.progress.isCompleted = true;
    notifyListeners();
    console.log(`[ImagePreloader] Completed preloading cycle. Loaded: ${currentStats.progress.loaded}, Failed: ${currentStats.progress.failed}`);
  };

  // Start processing in the background without blocking the caller's main call stack
  setTimeout(() => {
    processQueue().catch((err) => {
      console.error('[ImagePreloader] Fatal error in preloading worker:', err);
      currentStats.isPreloading = false;
      notifyListeners();
    });
  }, 100);
}

/**
 * Subscribe to preloading progress updates.
 */
export function subscribeToPreload(listener: (stats: PreloaderStats) => void): () => void {
  listeners.add(listener);
  // Send immediate current status
  listener({ ...currentStats });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns single preloaded image from cache if it exists, otherwise falls back to preloading it instantly.
 */
export function getCachedImage(url: string): HTMLImageElement | null {
  if (imageCacheRegistry.has(url)) {
    return imageCacheRegistry.get(url)!;
  }
  
  // If it previously failed or isn't cached yet, retry preloading in background
  if (failedUrls.has(url) || !imageCacheRegistry.has(url)) {
    preloadSingleImage(url).catch((err) => {
      console.warn(`[ImagePreloader] Retry load on request failed for ${url}:`, err);
    });
  }
  
  return null;
}

/**
 * Returns true if an image URL is cached.
 */
export function isImageCached(url: string): boolean {
  return imageCacheRegistry.has(url);
}

/**
 * Retrieves the master stats instance of the preloader.
 */
export function getPreloaderStats(): PreloaderStats {
  return { ...currentStats };
}
