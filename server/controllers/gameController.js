const GAMES_DIRECTORY = [
    {
        id: "valorant",
        name: "Valorant",
        genre: "Tactical FPS",
        publisher: "Riot Games",
        platforms: ["PC", "PlayStation", "Xbox"],
        coverUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
        badgeColor: "rose",
        activePlayersEstimate: "28M",
        modes: ["Competitive", "Unrated", "Premier", "Spike Rush", "Deathmatch"],
        ranks: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
    },
    {
        id: "apex-legends",
        name: "Apex Legends",
        genre: "Battle Royale / Hero Shooter",
        publisher: "Respawn Entertainment",
        platforms: ["PC", "PlayStation", "Xbox", "Nintendo"],
        coverUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80",
        badgeColor: "amber",
        activePlayersEstimate: "18M",
        modes: ["Ranked Leagues", "Trios", "Duos", "Mixtape"],
        ranks: ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Apex Predator"],
    },
    {
        id: "cs2",
        name: "Counter-Strike 2",
        genre: "Tactical FPS",
        publisher: "Valve",
        platforms: ["PC"],
        coverUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
        badgeColor: "sky",
        activePlayersEstimate: "31M",
        modes: ["Premier", "Competitive", "Wingman", "Casual", "Deathmatch"],
        ranks: ["Silver", "Gold Nova", "Master Guardian", "Distinguished", "Legendary Eagle", "Supreme", "Global Elite"],
    },
    {
        id: "league-of-legends",
        name: "League of Legends",
        genre: "MOBA",
        publisher: "Riot Games",
        platforms: ["PC"],
        coverUrl: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&auto=format&fit=crop&q=80",
        badgeColor: "emerald",
        activePlayersEstimate: "130M",
        modes: ["Ranked Solo/Duo", "Ranked Flex", "ARAM", "Normal Draft"],
        ranks: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"],
    },
    {
        id: "overwatch-2",
        name: "Overwatch 2",
        genre: "Hero Shooter",
        publisher: "Blizzard Entertainment",
        platforms: ["PC", "PlayStation", "Xbox", "Nintendo"],
        coverUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
        badgeColor: "orange",
        activePlayersEstimate: "12M",
        modes: ["Role Queue Ranked", "Open Queue", "Quick Play", "Arcade"],
        ranks: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Champion"],
    },
    {
        id: "destiny-2",
        name: "Destiny 2",
        genre: "Action MMO / Looter Shooter",
        publisher: "Bungie",
        platforms: ["PC", "PlayStation", "Xbox"],
        coverUrl: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80",
        badgeColor: "indigo",
        activePlayersEstimate: "8M",
        modes: ["Raids", "Dungeons", "Grandmaster Nightfall", "Trials of Osiris", "Crucible"],
        ranks: ["Guardian Rank 1-11", "Adept", "Ascendant"],
    },
    {
        id: "rainbow-six-siege",
        name: "Rainbow Six Siege",
        genre: "Tactical FPS",
        publisher: "Ubisoft",
        platforms: ["PC", "PlayStation", "Xbox"],
        coverUrl: "https://images.unsplash.com/photo-1552824722-ddab1374e622?w=600&auto=format&fit=crop&q=80",
        badgeColor: "cyan",
        activePlayersEstimate: "10M",
        modes: ["Ranked", "Standard", "Quick Match", "Arcade"],
        ranks: ["Copper", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Champions"],
    },
    {
        id: "fortnite",
        name: "Fortnite",
        genre: "Battle Royale",
        publisher: "Epic Games",
        platforms: ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile"],
        coverUrl: "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=600&auto=format&fit=crop&q=80",
        badgeColor: "purple",
        activePlayersEstimate: "110M",
        modes: ["Ranked Battle Royale", "Ranked Zero Build", "Creative", "Reload"],
        ranks: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Elite", "Champion", "Unreal"],
    },
    {
        id: "rocket-league",
        name: "Rocket League",
        genre: "Sports / Vehicular Soccer",
        publisher: "Psyonix",
        platforms: ["PC", "PlayStation", "Xbox", "Nintendo"],
        coverUrl: "https://images.unsplash.com/photo-1612287233214-749449f1db7a?w=600&auto=format&fit=crop&q=80",
        badgeColor: "blue",
        activePlayersEstimate: "15M",
        modes: ["Ranked 3v3", "Ranked 2v2", "Ranked 1v1", "Extra Modes"],
        ranks: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion", "Supersonic Legend"],
    },
    {
        id: "marvel-rivals",
        name: "Marvel Rivals",
        genre: "Super Hero Team-Based PVP",
        publisher: "NetEase Games",
        platforms: ["PC", "PlayStation", "Xbox"],
        coverUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
        badgeColor: "red",
        activePlayersEstimate: "14M",
        modes: ["Competitive", "Quick Match", "Conquest"],
        ranks: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Grandmaster", "Eternity", "One Above All"],
    },
];

export const getGamesDirectory = async (req, res) => {
    try {
        const { search = "", genre = "", platform = "" } = req.query;
        let results = [...GAMES_DIRECTORY];

        if (genre) {
            results = results.filter((g) => g.genre.toLowerCase().includes(genre.toLowerCase()));
        }

        if (platform) {
            results = results.filter((g) => g.platforms.some((p) => p.toLowerCase() === platform.toLowerCase()));
        }

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            results = results.filter((g) =>
                g.name.toLowerCase().includes(q) ||
                g.genre.toLowerCase().includes(q) ||
                g.publisher.toLowerCase().includes(q)
            );
        }

        res.json({
            success: true,
            total: results.length,
            games: results,
            genres: ["All", "Tactical FPS", "Battle Royale", "MOBA", "Hero Shooter", "Action MMO", "Sports"],
            platforms: ["All", "PC", "PlayStation", "Xbox", "Nintendo", "Mobile"],
        });
    } catch (error) {
        console.error("getGamesDirectory error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getGameDetails = async (req, res) => {
    try {
        const { gameId } = req.params;
        const game = GAMES_DIRECTORY.find((g) => g.id === gameId.toLowerCase() || g.name.toLowerCase() === gameId.toLowerCase());
        if (!game) {
            return res.status(404).json({ success: false, message: "Game not found in directory" });
        }
        res.json({ success: true, game });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
