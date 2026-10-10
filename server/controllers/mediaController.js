// Curated high-performance gaming GIFs with reliable CDN URLs
const CURATED_GAMING_GIFS = [
    {
        id: "gif-gg-1",
        title: "GG Well Played - Classic Neon",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZmdnFzbmZseHN0NTR4d3hhYnVwdzRiaHJhdmI4cTRqMG5qMXJ1byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BPJmthQ3YRwD6QqcVD/giphy.gif",
        previewUrl: "https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/200w.gif",
        category: "gg",
        tags: ["gg", "good game", "cheers", "celebrate", "victory"],
    },
    {
        id: "gif-clutch-1",
        title: "Insane Clutch 1v5",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmt2Z3JmYTBmbWFtcjBqaXRoc3E4aG9qYWkyZzhzMDlhZGlrcHlsZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/PUBxelZBCh4yI/giphy.gif",
        previewUrl: "https://media.giphy.com/media/PUBxelZBCh4yI/200w.gif",
        category: "clutch",
        tags: ["clutch", "hype", "win", "ace", "cat", "shock"],
    },
    {
        id: "gif-victory-1",
        title: "Victory Royale Dance",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR6cDBmYnkyYmZ4dHZmbTJ1NXlhMmc3dHc4YWhvaXZwYmVvdG83eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/artj92V8o75VPL7AeQ/giphy.gif",
        previewUrl: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif",
        category: "victory",
        tags: ["victory", "win", "dance", "fortnite", "champion"],
    },
    {
        id: "gif-rage-1",
        title: "Keyboard Smash Gamer Rage",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZndjN3J2Z2Z2bmJtNzJ4YWhwYnNpaG1sbm83YmVoZ2F4MG44OXExbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/11tTNkNy1SdXGg/giphy.gif",
        previewUrl: "https://media.giphy.com/media/11tTNkNy1SdXGg/200w.gif",
        category: "rage",
        tags: ["rage", "tilt", "smash", "angry", "keyboard", "defeat"],
    },
    {
        id: "gif-hype-1",
        title: "Let's Go Hype Scream",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjBxbml1bWpxN3R4b2UzbTRpajRrbG80dHc5NnFudWFjOGt4eGphYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/blSTtZehjAZ8I/giphy.gif",
        previewUrl: "https://media.giphy.com/media/blSTtZehjAZ8I/200w.gif",
        category: "hype",
        tags: ["hype", "lets go", "celebrate", "energy", "party"],
    },
    {
        id: "gif-rip-1",
        title: "Press F to Pay Respects",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJ2bnJ6d3VpYXBjZDRyOG9zNHR2MWhscWhjN3l1dzN5eGx5aW9qMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hStvd5LiWCFzYNyxR4/giphy.gif",
        previewUrl: "https://media.giphy.com/media/hStvd5LiWCFzYNyxR4/200w.gif",
        category: "rip",
        tags: ["rip", "f", "respect", "dead", "defeat", "sad"],
    },
    {
        id: "gif-lol-1",
        title: "Gamer Laugh Out Loud",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZkdzJ4ajBocGhpbjdpMnVlaHpmZDRnbHBpMjZ6Nm50d3ZvdXU4YyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/lszAB3TzFtHxK/giphy.gif",
        previewUrl: "https://media.giphy.com/media/lszAB3TzFtHxK/200w.gif",
        category: "laugh",
        tags: ["lol", "laugh", "funny", "rofl", "joke"],
    },
    {
        id: "gif-facepalm-1",
        title: "Total Miss Facepalm",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXl2b2V3aWV0cDJkaTVrNmpxMnpkMnZtcnh0ZzR3NXpiYTVmdmtzYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6OWIl75ibpuOI/giphy.gif",
        previewUrl: "https://media.giphy.com/media/6OWIl75ibpuOI/200w.gif",
        category: "facepalm",
        tags: ["facepalm", "disappointed", "whiff", "fail", "miss"],
    },
    {
        id: "gif-taunt-1",
        title: "Gamer GG Tease & Taunt",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG9kZzI3eWl4b2N3ODh0ZXN1NW1scXBqMGZ4d3J1bnJpM2NocHZ1aiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKr3nzbh5WgCFxe/giphy.gif",
        previewUrl: "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/200w.gif",
        category: "taunt",
        tags: ["taunt", "dance", "smug", "easy", "gg ez"],
    },
    {
        id: "gif-coffee-1",
        title: "All Night Gaming Grind",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzhidHB1eXpweHR5b29rOG15dzFtdml2eXNlNGcxaW8yZTRxdnJ4MiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oKIPnAiaMCws8nOsE/giphy.gif",
        previewUrl: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/200w.gif",
        category: "grind",
        tags: ["grind", "tired", "all night", "coffee", "ranked"],
    },
];

// ── Search & Filter GIFs ───────────────────────────────────────────────────
export const searchGifs = async (req, res) => {
    try {
        const { q = "", category = "", limit = 20 } = req.query;
        let results = [...CURATED_GAMING_GIFS];

        if (category && category.toLowerCase() !== "all") {
            results = results.filter((g) => g.category.toLowerCase() === category.toLowerCase());
        }

        if (q.trim()) {
            const queryWords = q.toLowerCase().trim().split(/\s+/);
            results = results.filter((gif) => {
                const text = `${gif.title} ${gif.tags.join(" ")} ${gif.category}`.toLowerCase();
                return queryWords.some((word) => text.includes(word));
            });
        }

        // Return up to limit
        res.json({
            success: true,
            total: results.length,
            gifs: results.slice(0, parseInt(limit)),
            categories: ["all", "gg", "clutch", "victory", "rage", "hype", "rip", "laugh", "facepalm", "taunt", "grind"],
        });
    } catch (error) {
        console.error("searchGifs error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── OpenGraph URL Metadata Scraper for Link Previews ────────────────────────
export const fetchLinkPreview = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== "string") {
            return res.status(400).json({ success: false, message: "Valid URL is required" });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                return res.status(400).json({ success: false, message: "Only HTTP/HTTPS URLs supported" });
            }
        } catch {
            return res.status(400).json({ success: false, message: "Malformed URL" });
        }

        // Fast fetch with AbortController timeout (3.5s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        let html = "";
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "GameConnectBot/1.0 (Mozilla/5.0 Gaming Link Previewer)",
                    "Accept": "text/html,application/xhtml+xml",
                },
            });
            clearTimeout(timeoutId);
            html = await response.text();
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            // Fallback for timeout or fetch error: return domain preview
            return res.json({
                success: true,
                preview: {
                    url,
                    title: parsedUrl.hostname,
                    description: `Direct link to ${parsedUrl.hostname}`,
                    image: "",
                    siteName: parsedUrl.hostname.replace("www.", ""),
                },
            });
        }

        // Extract metadata via regex (efficient without heavy DOM parser dependencies)
        const getMetaTag = (prop) => {
            const regex = new RegExp(`<meta\\s+[^>]*(?:property|name)=["'](?:og:|twitter:)?${prop}["'][^>]*content=["']([^"']+)["']`, "i");
            const match = html.match(regex);
            return match ? match[1] : null;
        };

        const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = getMetaTag("title") || (titleTagMatch ? titleTagMatch[1].trim() : parsedUrl.hostname);
        const description = getMetaTag("description") || `Link to ${parsedUrl.hostname}`;
        let image = getMetaTag("image") || "";
        const siteName = getMetaTag("site_name") || parsedUrl.hostname.replace("www.", "");

        // If image is relative, resolve it
        if (image && !image.startsWith("http")) {
            try {
                image = new URL(image, parsedUrl.origin).href;
            } catch {
                image = "";
            }
        }

        res.json({
            success: true,
            preview: {
                url,
                title: title.slice(0, 100),
                description: description.slice(0, 200),
                image,
                siteName,
            },
        });
    } catch (error) {
        console.error("fetchLinkPreview error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
