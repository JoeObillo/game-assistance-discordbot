const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ReactionCollector,
} = require("discord.js");
require("dotenv").config();

const PREFIX = "s!";
const GAME_API =
  "http://api.steampowered.com/ISteamApps/GetAppList/v0002/?key=STEAMKEY&format=json";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// to test if it's functioning PING!
function handlePingCommand(interaction) {
  interaction.reply(`Time to game!`);
}

// give game details
async function handleGameDetailsCommand(interaction, gameName) {
  try {
    // get all games list
    const response = await fetch(GAME_API);

    if (!response.ok) {
      throw new Error(`Failed to fetch game list: ${response.statusText}`);
    }

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

      // fetch details using the app ID
      const detailsResponse = await fetch(url);
      if (!detailsResponse.ok) {
        throw new Error(
          `API request failed with status ${detailsResponse.status}`
        );
      }

      const detailsData = await detailsResponse.json();
      const gameData = detailsData[appId]?.data; // for optional..?

      console.log("Full Details Data:", detailsData);
      console.log("App ID Data:", detailsData[appId]);

      // create and send the embed message with game details
      const embed = new EmbedBuilder()
        .setColor("#8A9A5B")
        .setTitle("Game Details")
        .setDescription(`Details about ${gameName}`)
        .addFields(
          {
            name: "Developers",
            value: Array.isArray(gameData.developers)
              ? gameData.developers.join(", ")
              : "N/A",
            inline: true,
          },
          {
            name: "Publishers",
            value: Array.isArray(gameData.publishers)
              ? gameData.publishers.join(", ")
              : "N/A",
            inline: true,
          },
          {
            name: "Platforms",
            value: Object.keys(gameData.platforms).join(", "),
            inline: true,
          },
          {
            name: "Genres",
            value: Array.isArray(gameData.genres)
              ? gameData.genres.map((genre) => genre.description).join(", ")
              : "N/A",
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

async function handlePollCommand(message) {
  // Check if message starts with prefix (e.g., `!poll`)
  if (!message.content.startsWith("!poll")) return;

  const content = message.content.slice("!poll".length).trim(); // Remove prefix and trim

  // Input validation (optional)
  if (content.length === 0) {
    return message.channel.send(
      "Please provide a question and at least two choices (separated by commas)."
    );
  }

  const [question, ...choices] = content.split(/,\s*/); // Split comma-separated choices, handling extra spaces

  if (choices.length < 2) {
    return message.channel.send("Please provide at least two choices.");
  }

  // Create embed with question and choices
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(question)
    .setFooter({ text: "React to vote!" });

  for (let i = 0; i < choices.length; i++) {
    const emoji = String.fromCharCode(65 + i); // Use letters (A, B, C...) as emojis
    embed.addField(`${emoji}`, choices[i], true); // Inline fields for readability
  }

  try {
    const sentMessage = await message.channel.send({ embeds: [embed] });

    // Add reactions to message for each choice
    for (let i = 0; i < choices.length; i++) {
      const emoji = String.fromCharCode(65 + i);
      await sentMessage.react(emoji);
    }

    // Collect reactions and update results
    const collector = sentMessage.createReactionCollector({
      filter: (reaction, user) => user.id !== message.client.user.id, // Ignore bot's reactions
    });

    collector.on("collect", async (reaction, user) => {
      const emoji = reaction.emoji.name;
      const choiceIndex = emoji.charCodeAt(0) - 65; // Convert emoji (A, B, C...) to index

      // Update embed with vote count
      const voteCount = reaction.count - 1; // Exclude bot's reaction
      embed.fields[
        choiceIndex
      ].value = `${choices[choiceIndex]} (${voteCount} votes)`;
      await sentMessage.edit({ embeds: [embed] });
    });

    collector.on("end", async () => {
      console.log("Poll collection ended.");
    });
  } catch (error) {
    console.error("Error creating poll:", error);
    return message.channel.send("An error occurred while creating the poll.");
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

  if (command.startsWith("poll")) {
    handlePollCommand(message);
  }
});

client.login(process.env.BOT_TOKEN);
