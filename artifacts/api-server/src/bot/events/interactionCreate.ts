import {
  type Interaction,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  ButtonInteraction,
  PermissionsBitField,
} from "discord.js";
import { logger } from "../../lib/logger";
import type { BotClient } from "../index";
import { handleTicketSelect } from "../components/ticketSelect";
import { handleTicketButtons } from "../components/ticketButtons";
import { errorEmbed } from "../utils/embeds";

export async function handleInteraction(interaction: Interaction, client: BotClient) {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, client);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction, client);
    } else if (interaction.isButton()) {
      await handleButton(interaction, client);
    }
  } catch (err) {
    logger.error({ err }, "Error handling interaction");
  }
}

async function handleCommand(interaction: ChatInputCommandInteraction, client: BotClient) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  if (command.permissions && interaction.guild) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const hasPerms = command.permissions.every((perm) =>
      member.permissions.has(perm as bigint)
    );
    if (!hasPerms) {
      await interaction.reply({
        embeds: [errorEmbed("Permission refusée", "Tu n'as pas les permissions nécessaires pour utiliser cette commande.")],
        ephemeral: true,
      });
      return;
    }
  }

  try {
    await command.execute(interaction, client);
  } catch (err) {
    logger.error({ err, command: interaction.commandName }, "Command execution error");
    const reply = {
      embeds: [errorEmbed("Erreur", "Une erreur est survenue lors de l'exécution de la commande.")],
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction, client: BotClient) {
  if (interaction.customId === "ticket_service_select") {
    await handleTicketSelect(interaction, client);
  }
}

async function handleButton(interaction: ButtonInteraction, client: BotClient) {
  const id = interaction.customId;
  if (id === "ticket_create") {
    const { handleTicketCreate } = await import("../components/ticketCreate");
    await handleTicketCreate(interaction, client);
  } else if (
    id === "ticket_close" ||
    id === "ticket_claim" ||
    id === "ticket_transcript" ||
    id.startsWith("ticket_add_")
  ) {
    await handleTicketButtons(interaction, client);
  }
}
