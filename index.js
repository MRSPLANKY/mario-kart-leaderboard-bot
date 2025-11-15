// Discord.js v14 bot with improved Mario Kart leaderboard
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import fs from "fs";
import express from "express";

// --- EXPRESS SERVER FOR RENDER ---
const app = express();
app.get("/", (req, res) => res.send("Mario Kart Leaderboard Bot Running"));
app.listen(process.env.PORT || 3000);

// ---- LOAD / SAVE STATE ----
const STATE_FILE = "leaderboard.json";
let leaderboardMessageId = null;
let leaderboard = {};

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      leaderboardMessageId = data.leaderboardMessageId || null;
      leaderboard = data.leaderboard || {};
      console.log("Loaded saved leaderboard & message ID");
    } catch {
      console.log("Failed to parse state file, starting fresh.");
    }
  }
}

function saveState() {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(
      { leaderboardMessageId, leaderboard },
      null,
      2
    )
  );
}

// ---- TRACKS ----
const TRACKS = [
  "Acorn Heights", "Airship Fortress", "Boo Cinema", "Bowser's Castle",
  "Cheep Cheep Falls", "Choco Mountain", "Crown City", "Dandelion Depths",
  "Desert Hills", "Dino Dino Jungle", "DK Pass", "DK Spaceport",
  "Dry Bones Burnout", "Faraway Oasis", "Great Block Ruins",
  "Koopa Troopa Beach", "Mario Circuit", "Moo Moo Meadows", "Peach Beach",
  "Peach Stadium", "Rainbow Road", "Salty Salty Speedway", "Shy Guy Bazaar",
  "Sky-High Sundae", "Starview Peak", "Toad's Factory", "Wario Shipyard",
  "Wario Stadium", "Whistlestop Summit"
];

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
  "whistlestop summit": "⛰️",
};

// Load existing state OR initialize a new leaderboard
loadState();
if (Object.keys(leaderboard).length === 0) {
  leaderboard = TRACKS.reduce((acc, t) => {
    acc[t.toLowerCase()] = { track: t, time: "—", holder: "—" };
    return acc;
  }, {});
  saveState();
}

const LEADERBOARD_CHANNEL_ID = "1438849771056926761";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---- Command shortcuts ----
const COMMAND_KEYS = {};
for (const t of TRACKS) {
  COMMAND_KEYS[t.toLowerCase().replace(/[^a-z0-9]/g, "")] = t;
}

// ---- Time utilities ----
function isValidTime(t) {
  return /^((\d+:)?[0-5]?\d\.\d{1,3})$/.test(t);
}

function normalizeTime(t) {
  if (/^[0-5]?\d\.\d{1,3}$/.test(t)) {
    const [sec, ms] = t.split(".");
    return `0:${sec.padStart(2, "0")}.${ms}`;
  }
  if (/^\d+:[0-5]?\d\.\d{1,3}$/.test(t)) {
    const [m, rest] = t.split(":");
    const [sec, ms] = rest.split(".");
    return `${m}:${sec.padStart(2, "0")}.${ms}`;
  }
  return t;
}

function timeToMs(t) {
  if (t === "—") return null;
  const [m, rest] = t.split(":");
  const [s, ms] = rest.split(".");
  return parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
}

// ---- Build leaderboard ----
function buildLeaderboardEmbeds() {
  const embeds = [];
  const fields = Object.keys(leaderboard).map((key) => {
    const e = leaderboard[key];
    const icon = TRACK_EMOJIS[key] || "🏁";
    return {
      name: `${icon} ${e.track}`,
      value: `**Time:** ${e.time}\n**Holder:** ${e.holder}`,
      inline: true,
    };
  });

  for (let i = 0; i < fields.length; i += 25) {
    embeds.push(
      new EmbedBuilder()
        .setTitle("🏁 Mario Kart Leaderboard")
        .setColor(0x00aeef)
        .setDescription("Fastest confirmed times")
        .addFields(fields.slice(i, i + 25))
    );
  }

  return embeds;
}

// ---- Startup ----
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);

  try {
    if (leaderboardMessageId) {
      const msg = await channel.messages.fetch(leaderboardMessageId);
      await msg.edit({ embeds: buildLeaderboardEmbeds() });
      console.log("Edited existing leaderboard");
    } else {
      const msg = await channel.send({ embeds: buildLeaderboardEmbeds() });
      leaderboardMessageId = msg.id;
      saveState();
      console.log("Created new leaderboard");
    }
  } catch {
    console.log("Could not load old message — creating new one.");
    const msg = await channel.send({ embeds: buildLeaderboardEmbeds() });
    leaderboardMessageId = msg.id;
    saveState();
  }
});

// ---- Commands ----
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const parts = message.content.slice(1).trim().split(/\s+/);
  const command = parts.shift().toLowerCase();
  const time = parts.join(" ");

  const trackName = COMMAND_KEYS[command];
  if (!trackName) return;

  if (!isValidTime(time)) {
    return message.reply("❌ Invalid time. Use `mm:ss.ms` or `ss.ms`");
  }

  const key = trackName.toLowerCase();
  const newTime = normalizeTime(time);
  const oldTime = leaderboard[key].time;

  const newMs = timeToMs(newTime);
  const oldMs = timeToMs(oldTime);

  if (oldMs !== null && newMs >= oldMs) {
    return message.reply(
      `⛔ **Rejected!** Your time of **${newTime}** is not faster than **${oldTime}**.`
    );
  }

  leaderboard[key].time = newTime;
  leaderboard[key].holder = `<@${message.author.id}>`;
  saveState();

  const channel = await message.guild.channels.fetch(LEADERBOARD_CHANNEL_ID);
  const msg = await channel.messages.fetch(leaderboardMessageId);
  await msg.edit({ embeds: buildLeaderboardEmbeds() });

  message.reply(`🏆 New record on **${trackName}**: **${newTime}**!`);
});

client.login(process.env.TOKEN);