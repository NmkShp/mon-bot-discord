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

export const welcomeConfigCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("welcome-config")
    .setDescription("Configure le système de bienvenue")
    .addSubcommand((sub) =>
      sub
        .setName("welcome")
        .setDescription("Salon de bienvenue")
        .addChannelOption((opt) =>
          opt.setName("salon").setDescription("Salon").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("goodbye")
        .setDescription("Salon d'au revoir")
        .addChannelOption((opt) =>
          opt.setName("salon").setDescription("Salon").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("ticket-category")
        .setDescription("Catégorie pour les tickets")
        .addChannelOption((opt) =>
          opt.setName("categorie").setDescription("Catégorie").setRequired(true)
        )
    ),
  permissions: [PermissionsBitField.Flags.Administrator],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const sub = interaction.options.getSubcommand();

    if (sub === "welcome") {
      const channel = interaction.options.getChannel("salon", true) as TextChannel;
      store.setConfig(interaction.guild!.id, { welcomeChannelId: channel.id });
      await interaction.reply({
        embeds: [successEmbed("Bienvenue configuré", `Les messages de bienvenue iront dans ${channel}.`)],
        ephemeral: true,
      });
    } else if (sub === "goodbye") {
      const channel = interaction.options.getChannel("salon", true) as TextChannel;
      store.setConfig(interaction.guild!.id, { goodbyeChannelId: channel.id });
      await interaction.reply({
        embeds: [successEmbed("Au revoir configuré", `Les messages d'au revoir iront dans ${channel}.`)],
        ephemeral: true,
      });
    } else if (sub === "ticket-category") {
      const category = interaction.options.getChannel("categorie", true);
      store.setConfig(interaction.guild!.id, { ticketCategoryId: category.id });
      await interaction.reply({
        embeds: [successEmbed("Catégorie configurée", `Les tickets seront créés dans la catégorie **${category.name}**.`)],
        ephemeral: true,
      });
    }
  },
};
