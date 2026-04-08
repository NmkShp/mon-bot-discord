import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { successEmbed, errorEmbed } from "../../utils/embeds";
import { sendLog, modLogEmbed } from "../../utils/logger";

export const kickCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulser un membre du serveur")
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre à expulser").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("raison").setDescription("Raison").setRequired(false)
    ),
  permissions: [PermissionsBitField.Flags.KickMembers],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const user = interaction.options.getUser("membre", true);
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";

    try {
      const member = await interaction.guild!.members.fetch(user.id);
      await member.kick(`${interaction.user.tag}: ${reason}`);

      await interaction.reply({
        embeds: [successEmbed("Kick", `**${user.tag}** a été expulsé.\nRaison : ${reason}`)],
      });

      const log = modLogEmbed("Kick", `${interaction.user.tag}`, `${user.tag}`, reason);
      await sendLog(interaction.guild!, log);
    } catch {
      await interaction.reply({
        embeds: [errorEmbed("Erreur", "Impossible d'expulser ce membre.")],
        ephemeral: true,
      });
    }
  },
};
