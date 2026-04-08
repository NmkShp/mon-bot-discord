import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} from "discord.js";
import { logger } from "../lib/logger";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import type { Command } from "./types";

export interface BotClient extends Client {
  commands: Collection<string, Command>;
}

export async function startBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    logger.warn("DISCORD_TOKEN not set, bot will not start");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildModeration,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
  }) as BotClient;

  client.commands = new Collection<string, Command>();

  await loadCommands(client);
  await loadEvents(client);

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login Discord bot");
  });

  return client;
}
