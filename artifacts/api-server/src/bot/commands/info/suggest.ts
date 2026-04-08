import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { store } from "../../store";
import { errorEmbed } from "../../utils/embeds";

export const suggestCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Soumettre une suggestion")
    .addStringOption((opt) =>
      opt.setName("suggestion").setDescription("Votre suggestion").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const suggestion = interaction.options.getString("suggestion", true);
    const config = store.getConfig(interaction.guild!.id);

    const targetChannelId = config.suggestChannelId || interaction.channelId;
    const channel = await interaction.guild!.channels.fetch(targetChannelId);

    if (!channel || !channel.isTextBased() || !("send" in channel)) {
      await interaction.reply({ embeds: [errorEmbed("Erreur", "Salon de suggestions introuvable.")], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle("💡 Nouvelle Suggestion")
      .setDescription(suggestion)
      .addFields(
        { name: "Proposé par", value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
        { name: "Statut", value: "⏳ En attente", inline: true }
      )
      .setTimestamp();

    const upBtn = new ButtonBuilder()
      .setCustomId("suggest_up")
      .setLabel("👍 Approuver")
      .setStyle(ButtonStyle.Success);

    const downBtn = new ButtonBuilder()
      .setCustomId("suggest_down")
      .setLabel("👎 Refuser")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(upBtn, downBtn);

    const msg = await channel.send({ embeds: [embed], components: [row] });
    await msg.react("👍");
    await msg.react("👎");

    await interaction.reply({
      content: `✅ Ta suggestion a été soumise dans ${channel} !`,
      ephemeral: true,
    });
  },
};
