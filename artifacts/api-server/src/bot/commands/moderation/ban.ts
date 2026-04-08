import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { successEmbed, errorEmbed } from "../../utils/embeds";
import { sendLog } from "../../utils/logger";
import { modLogEmbed } from "../../utils/logger";

export const banCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre du serveur")
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre à bannir").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("raison").setDescription("Raison du ban").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("jours").setDescription("Nombre de jours de messages à supprimer (0-7)").setRequired(false)
    ),
  permissions: [PermissionsBitField.Flags.BanMembers],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const user = interaction.options.getUser("membre", true);
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const days = interaction.options.getInteger("jours") || 0;

    try {
      await interaction.guild!.members.ban(user, {
        reason: `${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: days * 86400,
      });

      await interaction.reply({
        embeds: [successEmbed("Ban", `**${user.tag}** a été banni.\nRaison : ${reason}`)],
      });

      const log = modLogEmbed("Ban", `${interaction.user.tag}`, `${user.tag}`, reason);
      await sendLog(interaction.guild!, log);
    } catch {
      await interaction.reply({
        embeds: [errorEmbed("Erreur", "Impossible de bannir ce membre. Vérifie les permissions.")],
        ephemeral: true,
      });
    }
  },
};
