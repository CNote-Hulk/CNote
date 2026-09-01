/**
 * NO_IMAGE_PLACEHOLDER
 * @description Fallback image shown for a marketplace listing with no photos.
 * Previously every call site pointed at `/assets/images/graphics/no-image-placeholder.jpg`,
 * a file that was never actually added to the repo (404 in production — confirmed
 * 2026-09-01, the browser just shows its broken-image icon instead of a placeholder).
 * An inline SVG data URI has no file to go missing and needs no extra network request,
 * so it's used here instead of trying to source/commit a real image asset.
 */
export const NO_IMAGE_PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%233a3a3a'/%3E%3Cg fill='none' stroke='%236b6b6b' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='130' y='95' width='140' height='110' rx='10'/%3E%3Ccircle cx='165' cy='130' r='12'/%3E%3Cpath d='M130 185l35-35 30 30 25-25 50 50'/%3E%3C/g%3E%3C/svg%3E";
