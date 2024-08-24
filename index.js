const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
require("dotenv").config();

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

async function handleGameCommand(interaction) {
  const list = await fetch(GAME_API);
  const gameData = await list.json();

  // get all games
  const games = gameData.applist.apps;

  // create an empty array to store random games
  const randomGames = [];

  // loop 5 times to get 5 random games
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * games.length);
    const randomGame = games[randomIndex];
    randomGames.push(randomGame);
  }

  // build the message string
  let message = "Here are 5 random games:\n";
  for (const game of randomGames) {
    message += `- ${game.name}\n`;
  }

  interaction.reply(message);
}

// give game details
async function handleGameDetailsCommand(interaction, gameName) {
  try {
    // get all games list
    const response = await fetch(GAME_API);
    const gameList = await response.json();
    const games = gameList.applist.apps;

    // find game by name (or other criteria)
    let foundGame = null;
    for (const game of games) {
      if (game.name.toLowerCase().includes(gameName.toLowerCase())) {
        // Case-insensitive search
        foundGame = game;
        break;
      }
    }

    // check if game was found
    if (foundGame) {
      const appId = foundGame.appid;

      // construct correct URL with app ID
      const encodedName = encodeURIComponent(gameName);
      const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

      console.log(detailsData[appId]);

      // fetch details using the app ID
      const detailsResponse = await fetch(url);
      if (!detailsResponse.ok) {
        throw new Error(
          `API request failed with status ${detailsResponse.status}`
        );
      }

      const detailsData = await detailsResponse.json();
      const gameData = detailsData[appId]?.data; // for optional..?

      // create and send the embed message with game details
      const embed = new EmbedBuilder()
        .setColor("#8A9A5B")
        .setTitle("Game Details")
        .setDescription(`Details about ${gameName}`)
        .addFields(
          {
            name: "Developers",
            value: gameData.developers?.join(", "),
            inline: true,
          },
          {
            name: "Publishers",
            value: gameData.publishers.join(", "),
            inline: true,
          },
          {
            name: "Platforms",
            value: Object.keys(gameData.platforms).join(", "),
            inline: true,
          },
          {
            name: "Genres",
            value: gameData.genres.map((genre) => genre.description).join(", "),
            inline: false,
          },
          {
            name: "Release Date",
            value: gameData.release_date.date,
            inline: true,
          }
        )
        .setImage(gameData.screenshots?.[0]?.path_thumbnail) // Using the first screenshot | img looks idk.. (will try to fix)
        .setFooter({
          text: "Data from Steam",
          iconURL: "https://steamcdn-a.akamaihd.net/apps/0/0/0/l/steamlogo.png",
        });

      console.log(gameData, gameName);

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply(`Game not found with the name: ${gameName}`);
    }
  } catch (error) {
    console.error("Error:", error);
    await interaction.reply("An error occurred while fetching game details.");
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

  if (command.startsWith("gameDetails")) {
    const gameName = command.substring("gameDetails ".length);
    handleGameDetailsCommand(message, gameName);
  }
});

client.login(process.env.BOT_TOKEN);
