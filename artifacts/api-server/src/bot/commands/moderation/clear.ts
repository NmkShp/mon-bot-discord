import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { successEmbed, errorEmbed } from "../../utils/embeds";

export const clearCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprimer des messages")
    .addIntegerOption((opt) =>
      opt
        .setName("nombre")
        .setDescription("Nombre de messages à supprimer (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Supprimer les messages d'un membre spécifique").setRequired(false)
    ),
  permissions: [PermissionsBitField.Flags.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const amount = interaction.options.getInteger("nombre", true);
    const filterUser = interaction.options.getUser("membre");

    const channel = interaction.channel;
    if (!channel || !("bulkDelete" in channel)) {
      await interaction.reply({ embeds: [errorEmbed("Erreur", "Impossible de supprimer dans ce salon.")], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      let toDelete = [...messages.values()].slice(0, amount);

      if (filterUser) {
        toDelete = toDelete.filter((m) => m.author.id === filterUser.id).slice(0, amount);
      }

      const deleted = await channel.bulkDelete(toDelete, true);

      await interaction.editReply({
        content: `✅ **${deleted.size}** message(s) supprimé(s)${filterUser ? ` de **${filterUser.tag}**` : ""}.`,
      });
    } catch {
      await interaction.editReply({
        content: "❌ Impossible de supprimer les messages (trop anciens ou erreur de permissions).",
      });
    }
  },
};
