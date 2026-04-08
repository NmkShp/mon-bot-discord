import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { store } from "../../store";
import { successEmbed, infoEmbed } from "../../utils/embeds";

export const protectConfigCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("protect-config")
    .setDescription("Configure le système de protection")
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Voir le statut de la protection")
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("Activer/désactiver la protection")
        .addStringOption((opt) =>
          opt
            .setName("module")
            .setDescription("Module à configurer")
            .setRequired(true)
            .addChoices(
              { name: "Protection générale", value: "protectEnabled" },
              { name: "Anti-Spam", value: "antiSpamEnabled" },
              { name: "Anti-Raid", value: "antiRaidEnabled" },
              { name: "Anti-Bot", value: "antiBotEnabled" },
              { name: "Anti-Liens", value: "antiLinkEnabled" },
              { name: "Anti-Mass Mention", value: "antiMassMentionEnabled" }
            )
        )
        .addBooleanOption((opt) =>
          opt.setName("activer").setDescription("Activer ou désactiver").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("whitelist-add")
        .setDescription("Ajouter un utilisateur à la whitelist")
        .addUserOption((opt) =>
          opt.setName("utilisateur").setDescription("Utilisateur").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("whitelist-remove")
        .setDescription("Retirer un utilisateur de la whitelist")
        .addUserOption((opt) =>
          opt.setName("utilisateur").setDescription("Utilisateur").setRequired(true)
        )
    ),
  permissions: [PermissionsBitField.Flags.Administrator],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const sub = interaction.options.getSubcommand();
    const config = store.getConfig(interaction.guild!.id);

    if (sub === "status") {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🛡️ Statut de la Protection")
        .addFields(
          { name: "Protection globale", value: config.protectEnabled ? "✅ Activée" : "❌ Désactivée", inline: true },
          { name: "Anti-Spam", value: config.antiSpamEnabled ? "✅ Activé" : "❌ Désactivé", inline: true },
          { name: "Anti-Raid", value: config.antiRaidEnabled ? "✅ Activé" : "❌ Désactivé", inline: true },
          { name: "Anti-Bot", value: config.antiBotEnabled ? "✅ Activé" : "❌ Désactivé", inline: true },
          { name: "Anti-Liens", value: config.antiLinkEnabled ? "✅ Activé" : "❌ Désactivé", inline: true },
          { name: "Anti-Mass Mention", value: config.antiMassMentionEnabled ? "✅ Activé" : "❌ Désactivé", inline: true },
          { name: "Whitelist", value: config.whitelist?.length ? config.whitelist.map((id) => `<@${id}>`).join(", ") : "Vide", inline: false }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === "toggle") {
      const module = interaction.options.getString("module", true) as keyof typeof config;
      const value = interaction.options.getBoolean("activer", true);
      store.setConfig(interaction.guild!.id, { [module]: value });
      await interaction.reply({
        embeds: [successEmbed("Protection mise à jour", `**${module}** : ${value ? "✅ Activé" : "❌ Désactivé"}`)],
        ephemeral: true,
      });
    } else if (sub === "whitelist-add") {
      const user = interaction.options.getUser("utilisateur", true);
      const whitelist = [...(config.whitelist || [])];
      if (!whitelist.includes(user.id)) whitelist.push(user.id);
      store.setConfig(interaction.guild!.id, { whitelist });
      await interaction.reply({
        embeds: [successEmbed("Whitelist", `${user} a été ajouté à la whitelist.`)],
        ephemeral: true,
      });
    } else if (sub === "whitelist-remove") {
      const user = interaction.options.getUser("utilisateur", true);
      const whitelist = (config.whitelist || []).filter((id) => id !== user.id);
      store.setConfig(interaction.guild!.id, { whitelist });
      await interaction.reply({
        embeds: [successEmbed("Whitelist", `${user} a été retiré de la whitelist.`)],
        ephemeral: true,
      });
    }
  },
};
