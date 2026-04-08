import { Events } from "discord.js";
import { logger } from "../../lib/logger";
import type { BotClient } from "../index";
import { handleInteraction } from "../events/interactionCreate";
import { handleGuildMemberAdd } from "../events/guildMemberAdd";
import { handleGuildMemberRemove } from "../events/guildMemberRemove";
import { handleMessageCreate } from "../events/messageCreate";
import { handleGuildBanAdd } from "../events/guildBanAdd";
import { handleChannelDelete } from "../events/channelDelete";
import { handleRoleDelete } from "../events/roleDelete";

export async function loadEvents(client: BotClient) {
  client.once(Events.ClientReady, (c) => {
    logger.info(`Bot is ready! Logged in as ${c.user.tag}`);
    c.user.setActivity("🛡️ Protection du serveur");
  });

  client.on(Events.InteractionCreate, (interaction) =>
    handleInteraction(interaction, client)
  );

  client.on(Events.GuildMemberAdd, (member) =>
    handleGuildMemberAdd(member, client)
  );

  client.on(Events.GuildMemberRemove, (member) =>
    handleGuildMemberRemove(member, client)
  );

  client.on(Events.MessageCreate, (message) =>
    handleMessageCreate(message, client)
  );

  client.on(Events.GuildBanAdd, (ban) =>
    handleGuildBanAdd(ban, client)
  );

  client.on(Events.ChannelDelete, (channel) =>
    handleChannelDelete(channel, client)
  );

  client.on(Events.GuildRoleDelete, (role) =>
    handleRoleDelete(role, client)
  );

  logger.info("Events loaded");
}
