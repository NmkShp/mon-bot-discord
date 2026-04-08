import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { successEmbed, errorEmbed } from "../../utils/embeds";
import { sendLog, modLogEmbed } from "../../utils/logger";

export const unmuteCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Retirer le timeout d'un membre")
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre à unmute").setRequired(true)
    ),
  permissions: [PermissionsBitField.Flags.ModerateMembers],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const user = interaction.options.getUser("membre", true);

    try {
      const member = await interaction.guild!.members.fetch(user.id);
      await member.timeout(null);

      await interaction.reply({
        embeds: [successEmbed("Unmute", `**${user.tag}** n'est plus en timeout.`)],
      });

      const log = modLogEmbed("Unmute", `${interaction.user.tag}`, `${user.tag}`, "Timeout retiré");
      await sendLog(interaction.guild!, log);
    } catch {
      await interaction.reply({
        embeds: [errorEmbed("Erreur", "Impossible de retirer le timeout.")],
        ephemeral: true,
      });
    }
  },
};
