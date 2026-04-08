import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { store } from "../../store";
import { successEmbed } from "../../utils/embeds";

export const logsConfigCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("logs-config")
    .setDescription("Configure le salon des logs")
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Salon pour les logs")
        .setRequired(true)
    ),
  permissions: [PermissionsBitField.Flags.Administrator],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const channel = interaction.options.getChannel("salon", true) as TextChannel;
    store.setConfig(interaction.guild!.id, { logsChannelId: channel.id });
    await interaction.reply({
      embeds: [successEmbed("Logs configurés", `Les logs seront envoyés dans ${channel}.`)],
      ephemeral: true,
    });
  },
};
