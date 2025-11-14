// Discord.js v14 bot with improved Mario Kart leaderboard
// - Time validation (mm:ss.ms or ss.ms)
// - Cleaner formatting
// - Error handling
// - Command style: !trackname <time>
// NOTE: Replace YOUR_BOT_TOKEN and LEADERBOARD_CHANNEL_ID.

import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

const TRACKS = [
  "Acorn Heights",
  "Airship Fortress",
  "Boo Cinema",
  "Bowser's Castle",
  "Cheep Cheep Falls",
  "Choco Mountain",
  "Crown City",
  "Dandelion Depths",
  "Desert Hills",
  "Dino Dino Jungle",
  "DK Pass",
  "DK Spaceport",
  "Dry Bones Burnout",
  "Faraway Oasis",
  "Great Block Ruins",
  "Koopa Troopa Beach",
  "Mario Circuit",
  "Moo Moo Meadows",
  "Peach Beach",
  "Peach Stadium",
  "Rainbow Road",
  "Salty Salty Speedway",
  "Shy Guy Bazaar",
  "Sky-High Sundae",
  "Starview Peak",
  "Toad's Factory",
  "Wario Shipyard",
  "Wario Stadium",
  "Whistlestop Summit"
];

// Emoji icons for each track
const TRACK_EMOJIS = {
  "acorn heights": "🌰",
  "airship fortress": "🛩️",
  "boo cinema": "🎬",
  "bowser's castle": "🏰",
  "cheep cheep falls": "🐟",
  "choco mountain": "🍫",
  "crown city": "👑",
  "dandelion depths": "🌼",
  "desert hills": "🏜️",
  "dino dino jungle": "🦖",
  "dk pass": "❄️",
  "dk spaceport": "🚀",
  "dry bones burnout": "💀",
  "faraway oasis": "🏝️",
  "great block ruins": "🧱",
  "koopa troopa beach": "🐢",
  "mario circuit": "🍄",
  "moo moo meadows": "🐄",
  "peach beach": "🍑",
  "peach stadium": "🎪",
  "rainbow road": "🌈",
  "salty salty speedway": "🧂",
  "shy guy bazaar": "🛍️",
  "sky-high sundae": "🍨",
  "starview peak": "⭐",
  "toad's factory": "🔧",
  "wario shipyard": "⚓",
  "wario stadium": "🎲",
  "whistlestop summit": "⛰️"
};

let leaderboard = TRACKS.reduce((acc, t) => {
  acc[t.toLowerCase()] = { track: t, time: '—', holder: '—' };
  return acc;
}, {});

const LEADERBOARD_CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE';
let leaderboardMessageId = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- Generate command keys ---
const COMMAND_KEYS = {};
for (const t of TRACKS) {
  const key = t.toLowerCase().replace(/[^a-z0-9]/g, "");
  COMMAND_KEYS[key] = t;
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);

  if (!leaderboardMessageId) {
    const msg = await channel.send({ embeds: [buildLeaderboardEmbed()] });
    leaderboardMessageId = msg.id;
  }
});

function isValidTime(t) {
  return /^((\d+:)?[0-5]?\d\.\d{1,3})$/.test(t);
}

// Normalize time to mm:ss.ms
function normalizeTime(t) {
  // Case 1 — exactly ss.ms  (ex: "58.5" or "7.12")
  if (/^[0-5]?\d\.\d{1,3}$/.test(t)) {
    // Make sure seconds have 2 digits
    const [sec, ms] = t.split(".");
    return `0:${sec.padStart(2, "0")}.${ms}`;
  }

  // Case 2 — mm:ss.ms but seconds might be 1 digit
  if (/^\d+:[0-5]?\d\.\d{1,3}$/.test(t)) {
    const [m, rest] = t.split(":");
    const [sec, ms] = rest.split(".");
    return `${m}:${sec.padStart(2,"0")}.${ms}`;
  }

  // Unknown format — return unchanged
  return t;
}

// Convert mm:ss.ms string into total milliseconds
function timeToMs(t) {
  if (t === "—") return null; // No previous record yet

  const [m, rest] = t.split(":");
  const [s, ms] = rest.split(".");

  return (parseInt(m) * 60000) + (parseInt(s) * 1000) + parseInt(ms);
}


function buildLeaderboardEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🏁 Mario Kart Leaderboard')
    .setColor(0x00aeef)
    .setDescription('Fastest confirmed times');

  for (const key of Object.keys(leaderboard)) {
    const e = leaderboard[key];
    const trackKey = e.track.toLowerCase();
    const icon = TRACK_EMOJIS[trackKey] || "🏁";
    embed.addFields({
      name: `${icon} ${e.track}`,
      value: `**Time:** ${e.time}\n**Holder:** ${e.holder}`,
      inline: true
    });
  }
  return embed;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const parts = message.content.slice(1).trim().split(/\s+/);
  const command = parts.shift().toLowerCase();
  const time = parts.join(' ');

  // Convert simplified command name to real track name
  const trackName = COMMAND_KEYS[command];
  if (!trackName) return;

  if (!isValidTime(time)) {
    return message.reply('❌ Invalid time. Use `mm:ss.ms` or `ss.ms`');
  }

  // Normalize the key for the leaderboard dictionary
  const key = trackName.toLowerCase();
const newTimeNorm = normalizeTime(time);
const oldTimeNorm = leaderboard[key].time;

// Convert times to milliseconds
const newMs = timeToMs(newTimeNorm);
const oldMs = timeToMs(oldTimeNorm);

// Case 1 — First time submitted (old = "—")
if (oldMs === null) {
  leaderboard[key].time = newTimeNorm;
  leaderboard[key].holder = `<@${message.author.id}>`;
} else {
  // Case 2 — Reject slower or equal times
  if (newMs >= oldMs) {
    return message.reply(
      `⛔ **Rejected!** Your time of **${newTimeNorm}** is not faster than the existing record: **${oldTimeNorm}**.`
    );
  }

  // Case 3 — Accept faster time
  leaderboard[key].time = newTimeNorm;
  leaderboard[key].holder = `<@${message.author.id}>`;
}


  // Update the leaderboard message
  const channel = await message.guild.channels.fetch(LEADERBOARD_CHANNEL_ID);
  const msg = await channel.messages.fetch(leaderboardMessageId);
  await msg.edit({ embeds: [buildLeaderboardEmbed()] });

  message.reply(`🏆 New record on **${trackName}**: **${leaderboard[key].time}**!`);

});

client.login(process.env.TOKEN);

