import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import type { Command } from "../../types";
import { panelEmbed, errorEmbed } from "../../utils/embeds";
import type { BotClient } from "../../index";

export const ticketPanelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Envoie le panel de tickets dans un salon")
    .addChannelOption((opt) =>
      opt.setName("salon").setDescription("Salon où envoyer le panel").setRequired(false)
    ),
  permissions: [PermissionsBitField.Flags.ManageGuild],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const channel =
      (interaction.options.getChannel("salon") as TextChannel | null) ||
      (interaction.channel as TextChannel);

    if (!channel || !channel.isTextBased() || !("send" in channel)) {
      await interaction.reply({
        embeds: [errorEmbed("Erreur", "Salon invalide.")],
        ephemeral: true,
      });
      return;
    }

    const btn = new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("🎫 Créer un Ticket")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btn);

    await channel.send({ embeds: [panelEmbed()], components: [row] });

    await interaction.reply({
      content: `✅ Panel de tickets envoyé dans ${channel} !`,
      ephemeral: true,
    });
  },
};
