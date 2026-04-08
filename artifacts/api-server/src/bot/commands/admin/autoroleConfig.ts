import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type Role,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";
import { store } from "../../store";
import { successEmbed } from "../../utils/embeds";

export const autoroleConfigCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("autorole-config")
    .setDescription("Configure le rôle automatique pour les nouveaux membres")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Définir le rôle automatique")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Rôle à attribuer").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Retirer le rôle automatique")
    )
    .addSubcommand((sub) =>
      sub
        .setName("staff")
        .setDescription("Définir le rôle staff pour les tickets")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Rôle staff").setRequired(true)
        )
    ),
  permissions: [PermissionsBitField.Flags.Administrator],

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const role = interaction.options.getRole("role", true) as Role;
      store.setConfig(interaction.guild!.id, { autoRoleId: role.id });
      await interaction.reply({
        embeds: [successEmbed("Auto-rôle configuré", `Le rôle **${role.name}** sera attribué aux nouveaux membres.`)],
        ephemeral: true,
      });
    } else if (sub === "remove") {
      store.setConfig(interaction.guild!.id, { autoRoleId: undefined });
      await interaction.reply({
        embeds: [successEmbed("Auto-rôle retiré", "Le rôle automatique a été désactivé.")],
        ephemeral: true,
      });
    } else if (sub === "staff") {
      const role = interaction.options.getRole("role", true) as Role;
      store.setConfig(interaction.guild!.id, { staffRoleId: role.id });
      await interaction.reply({
        embeds: [successEmbed("Rôle staff configuré", `Le rôle **${role.name}** aura accès aux tickets.`)],
        ephemeral: true,
      });
    }
  },
};
