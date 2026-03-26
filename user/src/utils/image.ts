/**
 * Utility to process image URLs.
 * In development, it rewrites production Firebase URLs to use the local proxy.
 */
export const getAssetUrl = (url: string | undefined): string => {
    if (!url) return "https://api.dicebear.com/7.x/initials/svg?seed=Product"; // More reliable placeholder
    
    // If the URL is a full production URL, rewrite it to use the local /uploads proxy in dev
    const prodDomain = "https://fivenursings-73917017-a0dfd.web.app";
    if ((import.meta as any).env.DEV && url.startsWith(prodDomain)) {
        return url.replace(prodDomain, "");
    }
    
    return url;
};
