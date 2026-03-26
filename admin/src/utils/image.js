/**
 * Utility to process image URLs.
 * In development, it rewrites production Firebase URLs to use the local proxy.
 */
export const getAssetUrl = (url) => {
    if (!url) return "https://via.placeholder.com/150?text=No+Image";
    
    // If the URL is a full production URL, rewrite it to use the local /uploads proxy in dev
    const prodDomain = "https://fivenursings-73917017-a0dfd.web.app";
    if (import.meta.env.DEV && url.startsWith(prodDomain)) {
        return url.replace(prodDomain, "");
    }
    
    // If the URL is already relative (starts with /uploads), it will be handled by the Vite proxy
    return url;
};
