import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { errorEmbed } from "../../utils/embeds";

const giveaways = new Map<string, { prize: string; endTime: number; entries: Set<string>; messageId: string; channelId: string }>();

export const giveawayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Système de giveaway")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Lancer un giveaway")
        .addStringOption((opt) =>
          opt.setName("lot").setDescription("Ce que vous offrez").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("duree").setDescription("Durée en minutes").setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("end").setDescription("Terminer un giveaway (ID du message)")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("ID du message du giveaway").setRequired(true)
        )
    ),
  permissions: [PermissionsBitField.Flags.ManageGuild],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const prize = interaction.options.getString("lot", true);
      const duration = interaction.options.getInteger("duree", true);
      const endTime = Date.now() + duration * 60 * 1000;

      const embed = new EmbedBuilder()
        .setColor(Colors.Gold)
        .setTitle("🎉 GIVEAWAY 🎉")
        .setDescription(
          `**Lot :** ${prize}\n\n` +
            `**Fin :** <t:${Math.floor(endTime / 1000)}:R>\n` +
            `**Organisé par :** ${interaction.user}\n\n` +
            `Clique sur 🎉 pour participer !`
        )
        .setFooter({ text: `Fin dans ${duration} minutes` })
        .setTimestamp(endTime);

      const btn = new ButtonBuilder()
        .setCustomId("giveaway_enter")
        .setLabel("🎉 Participer")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btn);

      await interaction.reply({ embeds: [embed], components: [row] });
      const msg = await interaction.fetchReply();

      giveaways.set(msg.id, {
        prize,
        endTime,
        entries: new Set(),
        messageId: msg.id,
        channelId: interaction.channelId,
      });

      // Auto-end giveaway
      setTimeout(async () => {
        const gw = giveaways.get(msg.id);
        if (!gw) return;

        const entries = [...gw.entries];
        const winner = entries.length ? entries[Math.floor(Math.random() * entries.length)] : null;

        const endEmbed = new EmbedBuilder()
          .setColor(Colors.Gold)
          .setTitle("🎉 GIVEAWAY TERMINÉ")
          .setDescription(
            winner
              ? `**Lot :** ${gw.prize}\n\n🎊 Gagnant : <@${winner}> Félicitations !`
              : `**Lot :** ${gw.prize}\n\nAucun participant.`
          )
          .setTimestamp();

        try {
          const channel = await client.channels.fetch(gw.channelId);
          if (channel && channel.isTextBased() && "send" in channel) {
            await channel.send({ embeds: [endEmbed] });
          }
        } catch {}

        giveaways.delete(msg.id);
      }, duration * 60 * 1000);
    } else if (sub === "end") {
      const id = interaction.options.getString("id", true);
      const gw = giveaways.get(id);
      if (!gw) {
        await interaction.reply({ embeds: [errorEmbed("Erreur", "Giveaway introuvable.")], ephemeral: true });
        return;
      }

      const entries = [...gw.entries];
      const winner = entries.length ? entries[Math.floor(Math.random() * entries.length)] : null;

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Gold)
            .setTitle("🎉 Giveaway terminé !")
            .setDescription(winner ? `Gagnant : <@${winner}> - **${gw.prize}**` : "Aucun participant.")
            .setTimestamp(),
        ],
      });

      giveaways.delete(id);
    }
  },
};
