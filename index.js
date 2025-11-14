//---------------------------------------------------------------
//  EXPRESS SERVER (required for Render to keep bot alive)
//---------------------------------------------------------------
import express from "express";
const app = express();

app.get("/", (req, res) => {
  res.send("Mario Kart Leaderboard Bot Running");
});

app.listen(process.env.PORT || 3000);


//---------------------------------------------------------------
//  DISCORD BOT
//---------------------------------------------------------------
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import fs from "fs";

// Track list
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
  "Whistlestop Summit",
];

// Emojis per track
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

//---------------------------------------------------------------
//  LOAD / SAVE DATA
//---------------------------------------------------------------
let leaderboard = {};
let leaderboardMessageId = null;

function loadLeaderboard() {
  try {
    const data = JSON.parse(fs.readFileSync("leaderboard.json", "utf8"));
    leaderboard = data.leaderboard;
    leaderboardMessageId = data.leaderboardMessageId;
    console.log("✅ Loaded leaderboard + message ID");
  } catch {
    console.log("⚠ No leaderboard file found, starting fresh");
    leaderboard = TRACKS.reduce((acc, t) => {
      acc[t.toLowerCase()] = { track: t, time: "—", holder: "—" };
      return acc;
    }, {});
  }
}

function saveLeaderboard() {
  fs.writeFileSync(
    "leaderboard.json",
    JSON.stringify(
      { leaderboard, leaderboardMessageId },
      null,
      2
    )
  );
  console.log("💾 Saved leaderboard + message ID");
}

loadLeaderboard();

//---------------------------------------------------------------
//  DISCORD CLIENT
//---------------------------------------------------------------
const LEADERBOARD_CHANNEL_ID = "1438849771056926761";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Command map
const COMMAND_KEYS = {};
for (const t of TRACKS) {
  COMMAND_KEYS[t.toLowerCase().replace(/[^a-z0-9]/g, "")] = t;
}

//---------------------------------------------------------------
//  BUILD EMBEDS (split into multiple embeds if needed)
//---------------------------------------------------------------
function buildLeaderboardEmbeds() {
  const fields = Object.keys(leaderboard).map((key) => {
    const e = leaderboard[key];
    const icon = TRACK_EMOJIS[key] || "🏁";
    return {
      name: `${icon} ${e.track}`,
      value: `**Time:** ${e.time}\n**Holder:** ${e.holder}`,
      inline: true,
    };
  });

  const embeds = [];
  for (let i = 0; i < fields.length; i += 25) {
    const embed = new EmbedBuilder()
      .setTitle("🏁 Mario Kart Leaderboard")
      .setColor(0x00aeef)
      .setDescription("Fastest times across all tracks")
      .addFields(fields.slice(i, i + 25));
    embeds.push(embed);
  }

  return embeds;
}

//---------------------------------------------------------------
//  TIME HELPERS
//---------------------------------------------------------------
function isValidTime(t) {
  return /^((\d+:)?[0-5]?\d\.\d{1,3})$/.test(t);
}

function normalizeTime(t) {
  if (/^[0-5]?\d\.\d{1,3}$/.test(t)) {
    const [s, ms] = t.split(".");
    return `0:${s.padStart(2, "0")}.${ms}`;
  }
  if (/^\d+:[0-5]?\d\.\d{1,3}$/.test(t)) {
    const [m, rest] = t.split(":");
    const [s, ms] = rest.split(".");
    return `${m}:${s.padStart(2, "0")}.${ms}`;
  }
  return t;
}

function timeToMs(t) {
  if (t === "—") return null;
  const [m, rest] = t.split(":");
  const [s, ms] = rest.split(".");
  return +m * 60000 + +s * 1000 + +ms;
}

//---------------------------------------------------------------
//  READY EVENT
//---------------------------------------------------------------
client.once("clientReady", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);

  // Only create the leaderboard message ONCE
  if (!leaderboardMessageId) {
    console.log("📌 No leaderboard message found — creating a new one");
    const msg = await channel.send({ embeds: buildLeaderboardEmbeds() });
    leaderboardMessageId = msg.id;
    saveLeaderboard();
  } else {
    console.log("📌 Reusing existing leaderboard message:", leaderboardMessageId);
  }
});

//---------------------------------------------------------------
//  COMMAND HANDLING
//---------------------------------------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const parts = message.content.slice(1).trim().split(/\s+/);
  const command = parts.shift().toLowerCase();
  const time = parts.join(" ");

  const trackName = COMMAND_KEYS[command];
  if (!trackName) return;

  if (!isValidTime(time)) {
    return message.reply("❌ Invalid time format. Use `mm:ss.ms` or `ss.ms`");
  }

  const key = trackName.toLowerCase();
  const newTimeNorm = normalizeTime(time);
  const oldTimeNorm = leaderboard[key].time;

  const newMs = timeToMs(newTimeNorm);
  const oldMs = timeToMs(oldTimeNorm);

  if (oldMs === null || newMs < oldMs) {
    leaderboard[key].time = newTimeNorm;
    leaderboard[key].holder = `<@${message.author.id}>`;
    saveLeaderboard();

    const channel = await message.guild.channels.fetch(LEADERBOARD_CHANNEL_ID);
    const msg = await channel.messages.fetch(leaderboardMessageId);
    await msg.edit({ embeds: buildLeaderboardEmbeds() });

    return message.reply(`🏆 New record on **${trackName}**: **${newTimeNorm}**!`);
  }

  message.reply(
    `⛔ Your time **${newTimeNorm}** is not faster than the current record **${oldTimeNorm}**`
  );
});

//---------------------------------------------------------------
//  LOGIN
//---------------------------------------------------------------
client.login(process.env.TOKEN);