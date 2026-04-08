import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { successEmbed, errorEmbed } from "../../utils/embeds";
import { sendLog, modLogEmbed } from "../../utils/logger";

const warnings = new Map<string, { reason: string; date: Date; by: string }[]>();

export const warnCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertir un membre")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Ajouter un avertissement")
        .addUserOption((opt) => opt.setName("membre").setDescription("Membre").setRequired(true))
        .addStringOption((opt) => opt.setName("raison").setDescription("Raison").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Voir les avertissements d'un membre")
        .addUserOption((opt) => opt.setName("membre").setDescription("Membre").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("clear")
        .setDescription("Effacer les avertissements d'un membre")
        .addUserOption((opt) => opt.setName("membre").setDescription("Membre").setRequired(true))
    ),
  permissions: [PermissionsBitField.Flags.ModerateMembers],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser("membre", true);
    const key = `${interaction.guild!.id}-${user.id}`;

    if (sub === "add") {
      const reason = interaction.options.getString("raison", true);
      const userWarns = warnings.get(key) || [];
      userWarns.push({ reason, date: new Date(), by: interaction.user.tag });
      warnings.set(key, userWarns);

      await interaction.reply({
        embeds: [successEmbed("Avertissement", `**${user.tag}** a reçu un avertissement.\nRaison : ${reason}\nTotal : **${userWarns.length}** avertissement(s)`)],
      });

      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Orange)
              .setTitle(`⚠️ Avertissement sur ${interaction.guild!.name}`)
              .setDescription(`Tu as reçu un avertissement.\n**Raison :** ${reason}`)
              .setTimestamp(),
          ],
        });
      } catch {}

      const log = modLogEmbed("Warn", `${interaction.user.tag}`, `${user.tag}`, reason);
      await sendLog(interaction.guild!, log);
    } else if (sub === "list") {
      const userWarns = warnings.get(key) || [];
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`⚠️ Avertissements de ${user.tag}`)
        .setDescription(
          userWarns.length
            ? userWarns.map((w, i) => `**${i + 1}.** ${w.reason} *(par ${w.by})*`).join("\n")
            : "Aucun avertissement"
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === "clear") {
      warnings.delete(key);
      await interaction.reply({
        embeds: [successEmbed("Avertissements effacés", `Les avertissements de **${user.tag}** ont été effacés.`)],
        ephemeral: true,
      });
    }
  },
};
