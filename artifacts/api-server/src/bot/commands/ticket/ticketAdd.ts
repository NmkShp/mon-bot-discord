import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { store } from "../../store";
import { errorEmbed, successEmbed } from "../../utils/embeds";

export const ticketAddCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket-add")
    .setDescription("Ajoute un membre au ticket")
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre à ajouter").setRequired(true)
    ),
  permissions: [PermissionsBitField.Flags.ManageChannels],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const ticket = store.getTicket(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        embeds: [errorEmbed("Erreur", "Ce salon n'est pas un ticket.")],
        ephemeral: true,
      });
      return;
    }

    const member = interaction.options.getMember("membre") as GuildMember;
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed("Erreur", "Membre introuvable.")], ephemeral: true });
      return;
    }

    const channel = interaction.channel;
    if (!channel || !("permissionOverwrites" in channel)) {
      await interaction.reply({ embeds: [errorEmbed("Erreur", "Impossible de modifier les permissions.")], ephemeral: true });
      return;
    }

    await channel.permissionOverwrites.create(member, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.reply({
      embeds: [successEmbed("Membre ajouté", `${member} a été ajouté au ticket.`)],
    });
  },
};
