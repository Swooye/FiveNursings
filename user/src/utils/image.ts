/**
 * Utility to process image URLs.
 * In development, it rewrites production Firebase URLs to use the local proxy.
 */
export const getAssetUrl = (url: string | undefined): string => {
    if (!url) return "https://api.dicebear.com/7.x/initials/svg?seed=Product"; // More reliable placeholder
    
    if (url.startsWith('/uploads')) {
        return url;
    }
    
    return url;
};
