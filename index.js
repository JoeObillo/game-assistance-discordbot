const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

// import Discord, { GatewayIntentBits } from "discord.js";
// import dotenv from "dotenv";

// dotenv.config();

const PREFIX = "s!";
const GAME_API =
  "http://api.steampowered.com/ISteamApps/GetAppList/v0002/?key=STEAMKEY&format=json";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// to test if it's functioning PING!
function handlePingCommand(interaction) {
  interaction.reply(`Ready to stream? Hi [will edit this later]`);
}

// get a random game
async function handleGameCommand(interaction) {
  const list = await fetch(GAME_API);
  const game = await list.json();

  // gamelist
  const games = game.applist.apps;
  const randomIndex = Math.floor(Math.random() * games.length);
  const randomGame = games[randomIndex];

  // access game name
  const gameName = randomGame.name;

  interaction.reply(`Here's a random game: ${gameName}`);
}

// give game details
async function handleGameDetailsCommand(interaction, gameName) {
  const url = `http://api.steampowered.com/appdetails?appids=${gameName}&key=${STEAM_API_KEY}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();

    console.log(data); // Log the entire response for inspection

    const appData = data[gameName];
    if (appData.success) {
      const gameInfo = appData.data;
      console.log(gameInfo); // Log gameInfo for debugging

      const embed = new MessageEmbed()
        .setTitle(gameInfo.name)
        .setThumbnail(gameInfo.header_image)
        .addField("Release Date:", gameInfo.release_date.date, true)
        .addField(
          "Genres:",
          gameInfo.genres.map((genre) => genre.description).join(", "),
          true
        );
      // ... rest of your embed code

      interaction.reply({ embeds: [embed] });
    } else {
      interaction.reply(`Game details not found for: ${gameName}`);
    }
  } catch (error) {
    console.error("Error:", error);
    interaction.reply("An error occurred while fetching game details.");
  }
}

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const command = message.content.substring(PREFIX.length);

  if (command === "start") {
    handlePingCommand(message);
  }

  if (command === "games") {
    handleGameCommand(message);
  }

  // still in progress
  if (command.startsWith("gameDetails")) {
    const gameName = command.substring("gameDetails ".length);
    console.log("3");
    handleGameDetailsCommand(message, gameName);
  }
});

client.login(process.env.BOT_TOKEN);
