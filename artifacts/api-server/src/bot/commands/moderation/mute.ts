import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { successEmbed, errorEmbed } from "../../utils/embeds";
import { sendLog, modLogEmbed } from "../../utils/logger";

export const muteCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mettre un membre en timeout (mute)")
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre à mute").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("duree")
        .setDescription("Durée en minutes")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((opt) =>
      opt.setName("raison").setDescription("Raison").setRequired(false)
    ),
  permissions: [PermissionsBitField.Flags.ModerateMembers],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const user = interaction.options.getUser("membre", true);
    const duration = interaction.options.getInteger("duree", true);
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";

    try {
      const member = await interaction.guild!.members.fetch(user.id);
      await member.timeout(duration * 60 * 1000, reason);

      await interaction.reply({
        embeds: [successEmbed("Mute", `**${user.tag}** a été mis en timeout pour **${duration} minutes**.\nRaison : ${reason}`)],
      });

      const log = modLogEmbed("Mute", `${interaction.user.tag}`, `${user.tag}`, `${reason} (${duration}min)`);
      await sendLog(interaction.guild!, log);
    } catch {
      await interaction.reply({
        embeds: [errorEmbed("Erreur", "Impossible de mute ce membre.")],
        ephemeral: true,
      });
    }
  },
};
