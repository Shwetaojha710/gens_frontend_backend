/**
 * MediaPipe BlazeFace face detection for registration camera.
 * Falls back to browser FaceDetector API when MediaPipe fails to load.
 */

export type FaceBox = { x: number; y: number; width: number; height: number; score?: number };

type MediaPipeFaceDetector = {
  detect: (image: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement) => {
    detections: Array<{
      boundingBox?: { originX: number; originY: number; width: number; height: number };
      categories?: Array<{ score?: number }>;
      keypoints?: Array<{ x: number; y: number; name?: string }>;
    }>;
  };
  close?: () => void;
};

let detectorPromise: Promise<MediaPipeFaceDetector | null> | null = null;
let cachedDetector: MediaPipeFaceDetector | null = null;

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

export async function loadFaceDetector(): Promise<MediaPipeFaceDetector | null> {
  if (cachedDetector) return cachedDetector;
  if (detectorPromise) return detectorPromise;

  detectorPromise = (async () => {
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
      const optionsBase = {
        runningMode: 'IMAGE' as const,
        minDetectionConfidence: 0.6,
        minSuppressionThreshold: 0.3,
      };
      let det;
      try {
        det = await vision.FaceDetector.createFromOptions(fileset, {
          ...optionsBase,
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        });
      } catch {
        det = await vision.FaceDetector.createFromOptions(fileset, {
          ...optionsBase,
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        });
      }
      cachedDetector = det as unknown as MediaPipeFaceDetector;
      return cachedDetector;
    } catch (err) {
      console.warn('MediaPipe FaceDetector load failed, will use browser fallback:', err);
      cachedDetector = null;
      return null;
    }
  })();

  return detectorPromise;
}

/** Run MediaPipe face detection on a canvas/video frame. */
export async function detectFacesMediaPipe(
  source: HTMLCanvasElement | HTMLVideoElement,
): Promise<FaceBox[]> {
  const det = await loadFaceDetector();
  if (!det) return [];

  try {
    const result = det.detect(source);
    const list = result?.detections || [];
    return list
      .map((d) => {
        const b = d.boundingBox;
        if (!b) return null;
        const score = d.categories?.[0]?.score ?? 0;
        return {
          x: b.originX,
          y: b.originY,
          width: b.width,
          height: b.height,
          score,
        } as FaceBox;
      })
      .filter((b): b is FaceBox => !!b && b.width > 0 && b.height > 0);
  } catch (err) {
    console.warn('MediaPipe detect failed:', err);
    return [];
  }
}

/** Browser Shape Detection API fallback (Chrome). */
export async function detectFacesBrowser(
  source: HTMLCanvasElement,
): Promise<FaceBox[]> {
  const FaceDetectorCtor = (
    window as unknown as {
      FaceDetector?: new (opts?: {
        fastMode?: boolean;
        maxDetectedFaces?: number;
      }) => {
        detect: (src: CanvasImageSource) => Promise<
          Array<{ boundingBox: DOMRectReadOnly }>
        >;
      };
    }
  ).FaceDetector;

  if (!FaceDetectorCtor) return [];
  try {
    const detector = new FaceDetectorCtor({ fastMode: false, maxDetectedFaces: 3 });
    const faces = await detector.detect(source);
    return (faces || []).map((f) => ({
      x: f.boundingBox.x,
      y: f.boundingBox.y,
      width: f.boundingBox.width,
      height: f.boundingBox.height,
      score: 1,
    }));
  } catch {
    return [];
  }
}

/** Prefer MediaPipe; fall back to browser FaceDetector. */
export async function detectFaces(
  source: HTMLCanvasElement,
): Promise<{ faces: FaceBox[]; engine: 'mediapipe' | 'browser' | 'none' }> {
  const mp = await detectFacesMediaPipe(source);
  if (mp.length) return { faces: mp, engine: 'mediapipe' };

  // MediaPipe loaded but 0 faces — trust that (don't fall through to weaker API)
  const det = await loadFaceDetector();
  if (det) return { faces: [], engine: 'mediapipe' };

  const browser = await detectFacesBrowser(source);
  if (browser.length) return { faces: browser, engine: 'browser' };
  return { faces: [], engine: 'none' };
}

export function disposeFaceDetector(): void {
  try {
    cachedDetector?.close?.();
  } catch {
    /* ignore */
  }
  cachedDetector = null;
  detectorPromise = null;
}
