export const APP_NAME = "Dottoh";
export const APP_VERSION = "0.1.0";

export const DEFAULT_MAX_IMAGE_SIZE_MB = 50;
export const DEFAULT_MAX_VIDEO_SIZE_MB = 100;
export const DEFAULT_MAX_VIDEO_DURATION_SEC = 30;
export const DEFAULT_MAX_VIDEO_INPUT_WIDTH_PX = 1920;
export const DEFAULT_MAX_VIDEO_INPUT_HEIGHT_PX = 1080;
export const DEFAULT_MAX_VIDEO_INPUT_FPS = 30;
export const DEFAULT_MP4_EXPORT_MAX_WIDTH_PX = 1280;
export const DEFAULT_MP4_EXPORT_MAX_HEIGHT_PX = 720;
export const DEFAULT_MP4_EXPORT_MAX_FPS = 12;
export const DEFAULT_GIF_EXPORT_MAX_DURATION_SEC = 15;
export const DEFAULT_RATE_LIMIT_PER_MIN = 30;

export const SUPPORTED_RASTER_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "heic",
  "heif",
  "tiff",
  "tif",
  "bmp",
  "avif",
] as const;

export const SUPPORTED_RAW_EXTENSIONS = [
  "arw",
  "dng",
  "cr2",
  "cr3",
  "nef",
  "raf",
] as const;

export const DEFAULT_ENABLED_RAW_FORMATS = ["arw", "dng"] as const;

export const SUPPORTED_EXPORT_FORMATS = [
  "png",
  "txt",
  "md",
  "svg",
  "html",
] as const;

export const SUPPORTED_VIDEO_EXTENSIONS = [
  "mp4",
  "gif",
  "mov",
  "webm",
] as const;

export const SUPPORTED_VIDEO_EXPORT_FORMATS = ["mp4", "gif"] as const;

