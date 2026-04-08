import { SlashCommandBuilder, PermissionsBitField, type ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { store } from "../../store";
import { errorEmbed } from "../../utils/embeds";
import { sendLog } from "../../utils/logger";
import { EmbedBuilder, Colors } from "discord.js";

export const ticketCloseCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket-close")
    .setDescription("Ferme le ticket actuel"),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const ticket = store.getTicket(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        embeds: [errorEmbed("Erreur", "Ce salon n'est pas un ticket.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Orange)
          .setTitle("🔒 Fermeture du ticket")
          .setDescription("Fermeture dans 5 secondes...")
          .setTimestamp(),
      ],
    });

    const logEmbed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setTitle("🎫 Ticket Fermé")
      .addFields(
        { name: "Fermé par", value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true }
      )
      .setTimestamp();
    await sendLog(interaction.guild!, logEmbed);

    store.closeTicket(interaction.channelId);

    setTimeout(async () => {
      try {
        await interaction.channel?.delete();
      } catch {}
    }, 5000);
  },
};
