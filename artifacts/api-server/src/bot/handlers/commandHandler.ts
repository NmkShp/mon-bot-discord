import { REST, Routes } from "discord.js";
import { logger } from "../../lib/logger";
import type { BotClient } from "../index";

import { ticketPanelCommand } from "../commands/ticket/ticketPanel";
import { ticketCloseCommand } from "../commands/ticket/ticketClose";
import { ticketAddCommand } from "../commands/ticket/ticketAdd";
import { ticketRemoveCommand } from "../commands/ticket/ticketRemove";
import { protectConfigCommand } from "../commands/admin/protectConfig";
import { logsConfigCommand } from "../commands/admin/logsConfig";
import { welcomeConfigCommand } from "../commands/admin/welcomeConfig";
import { banCommand } from "../commands/moderation/ban";
import { kickCommand } from "../commands/moderation/kick";
import { warnCommand } from "../commands/moderation/warn";
import { clearCommand } from "../commands/moderation/clear";
import { muteCommand } from "../commands/moderation/mute";
import { unmuteCommand } from "../commands/moderation/unmute";
import { statsCommand } from "../commands/info/stats";
import { suggestCommand } from "../commands/info/suggest";
import { giveawayCommand } from "../commands/fun/giveaway";
import { autoroleConfigCommand } from "../commands/admin/autoroleConfig";

const allCommands = [
  ticketPanelCommand,
  ticketCloseCommand,
  ticketAddCommand,
  ticketRemoveCommand,
  protectConfigCommand,
  logsConfigCommand,
  welcomeConfigCommand,
  banCommand,
  kickCommand,
  warnCommand,
  clearCommand,
  muteCommand,
  unmuteCommand,
  statsCommand,
  suggestCommand,
  giveawayCommand,
  autoroleConfigCommand,
];

export async function loadCommands(client: BotClient) {
  for (const command of allCommands) {
    client.commands.set(command.data.name, command);
  }
  logger.info(`Loaded ${allCommands.length} commands`);
  await registerSlashCommands();
}

async function registerSlashCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    logger.warn("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID for slash command registration");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const commandData = allCommands.map((c) => c.data.toJSON());

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandData,
      });
      logger.info(`Registered ${commandData.length} slash commands to guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commandData });
      logger.info(`Registered ${commandData.length} global slash commands`);
    }
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
