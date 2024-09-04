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
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// to test if it's functioning PING!
function handlePingCommand(interaction) {
  interaction.reply(
    `Game Assistant here! Ready to deliver a list of variety of games!`
  );
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

// display your own info
async function handleUserInfoCommand(message) {
  const { author } = message;
  const userInfo = new EmbedBuilder()
    .setColor("#8A9A5B")
    .setTitle("User Information")
    .setDescription(`Here is some information about ${author.username}`)
    .addFields(
      { name: "Username", value: author.username, inline: true },
      { name: "Tag", value: author.tag, inline: true },
      { name: "ID", value: author.id, inline: true },
      {
        name: "Created At",
        value: author.createdAt.toDateString(),
        inline: true,
      }
    )
    .setThumbnail(author.displayAvatarURL())
    .setFooter({
      text: "User Info",
      iconURL: author.displayAvatarURL(),
    });

  message.reply({ embeds: [userInfo] });
}

async function handlePollCommand(message, args) {
  // ensure there are at least 2 arguments (question and one option)
  if (args.length < 2) {
    return message.reply(
      "Please provide a question and at least one option for the poll."
    );
  }

  // extract the question and options
  const question = args.shift(); // remove the first item (question)
  const options = args; // remaining items are options

  // check for leading spaces before options
  const trimmedOptions = options.map((option) => option.trim());

  console.log(trimmedOptions);

  // create the poll embed
  const pollEmbed = new EmbedBuilder()
    .setColor("#8A9A5B")
    .setTitle("Poll")
    .setDescription(question)
    .addFields(
      trimmedOptions.map((option, index) => ({
        // Use trimmed options
        name: `${index + 1}. ${option}`,
        value: "\u200B",
        inline: true,
      }))
    )
    .setFooter({ text: "React with the corresponding number to vote!" });

  try {
    // send the embed message
    const pollMessage = await message.reply({ embeds: [pollEmbed] });

    // add reactions for the options
    for (let i = 1; i <= options.length; i++) {
      await pollMessage.react(`${i}️⃣`);
    }
  } catch (error) {
    console.error("Error creating poll:", error);
    message.reply("An error occurred while creating the poll.");
  }
}

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const command = message.content.substring(PREFIX.length);
  const args = command.split(/ +/);

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

  if (command.startsWith("userInfo")) {
    handleUserInfoCommand(message);
  }

  if (args[0] === "poll") {
    const pollArgs = command.slice(PREFIX.length + args[0].length).trim();
    [question, ...options] = pollArgs
      .split(/"/) // Split on quotes
      .map((arg) => arg.replace()); // Remove remaining quotes
    const regex = /\/([^/]+)\//g; // Matches quoted or unquoted words
    options = pollArgs.match(regex).map((arg) => arg.replace(/\/+/g, ""));
    handlePollCommand(message, [question, ...options]);
  }
});

client.login(process.env.BOT_TOKEN);
