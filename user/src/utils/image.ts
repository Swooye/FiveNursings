/**
 * Utility to process image URLs.
 * In development, it rewrites production Firebase URLs to use the local proxy.
 */
export const getAssetUrl = (url: string | undefined): string => {
    if (!url) return "https://api.dicebear.com/7.x/initials/svg?seed=Product"; // More reliable placeholder
    
    // If the path is relative (starts with /uploads), prefix with API_URL if in production
    const prodApiUrl = "https://api-u46fik5vcq-uc.a.run.app";
    const prodDomain = "https://fivenursings-73917017-a0dfd.web.app";
    
    if (url.startsWith('/uploads')) {
        return (import.meta as any).env.DEV ? url : `${prodApiUrl}${url}`;
    }

    // Rewrite production domain to local in dev
    if ((import.meta as any).env.DEV && url.startsWith(prodDomain)) {
        return url.replace(prodDomain, "");
    }
    
    return url;
};
