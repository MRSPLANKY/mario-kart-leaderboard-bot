// Discord.js v14 bot with improved Mario Kart leaderboard
// - Time validation (mm:ss.ms or ss.ms)
// - Cleaner formatting
// - Error handling
// - Command style: !trackname <time>
// NOTE: Replace YOUR_BOT_TOKEN and LEADERBOARD_CHANNEL_ID.

import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";

const TRACKS = [
  "Luigi Circuit",
  "Peach Beach",
  "Baby Park",
  "Dry Dry Desert",
  "Mushroom Bridge",
  "Mario Circuit",
  "Daisy Cruiser",
  "Waluigi Stadium",
  "Sherbet Land",
  "Mushroom City",
  "Yoshi Circuit",
  "DK Mountain",
  "Wario Colosseum",
  "Rainbow Road",
  "Toad’s Factory",
  "Moo Moo Meadows",
  "Mushroom Gorge",
  "Toad’s Turnpike",
  "Koopa Cape",
  "Daisy Hills",
  "Cheep Cheep Lagoon",
  "Shy Guy Falls",
  "Cloudtop Cruise",
  "Mount Wario",
  "Sunshine Airport",
  "Big Blue",
  "Wild Woods",
  "Animal Crossing",
  "Hyrule Circuit",
];

let leaderboard = TRACKS.reduce((acc, t) => {
  acc[t.toLowerCase()] = { track: t, time: "—", holder: "—" };
  return acc;
}, {});

const LEADERBOARD_CHANNEL_ID = "YOUR_CHANNEL_ID_HERE";
let leaderboardMessageId = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", async () => {
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

function buildLeaderboardEmbed() {
  const embed = new EmbedBuilder()
    .setTitle("🏁 Mario Kart Leaderboard")
    .setColor(0x00aeef)
    .setDescription("Fastest confirmed times");

  for (const key of Object.keys(leaderboard)) {
    const e = leaderboard[key];
    embed.addFields({
      name: e.track,
      value: `**Time:** ${e.time}\n**Holder:** ${e.holder}`,
      inline: true,
    });
  }
  return embed;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const parts = message.content.slice(1).trim().split(/\s+/);
  const command = parts.shift().toLowerCase();
  const time = parts.join(" ");

  if (!leaderboard[command]) return;

  if (!isValidTime(time))
    return message.reply("❌ Invalid time. Use `mm:ss.ms` or `ss.ms`");

  leaderboard[command].time = time;
  leaderboard[command].holder = `<@${message.author.id}>`;

  const channel = await message.guild.channels.fetch(LEADERBOARD_CHANNEL_ID);
  const msg = await channel.messages.fetch(leaderboardMessageId);
  await msg.edit({ embeds: [buildLeaderboardEmbed()] });

  message.reply(`Updated **${leaderboard[command].track}** to **${time}**!`);
});

client.login("YOUR_BOT_TOKEN");
