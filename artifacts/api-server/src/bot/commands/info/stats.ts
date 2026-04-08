import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types";
import type { BotClient } from "../../index";

export const statsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Afficher les statistiques du serveur"),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const guild = interaction.guild!;
    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter((m) => !m.user.bot).size;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const online = guild.members.cache.filter(
      (m) => m.presence?.status === "online" || m.presence?.status === "idle" || m.presence?.status === "dnd"
    ).size;
    const channels = guild.channels.cache.size;
    const roles = guild.roles.cache.size;
    const textChannels = guild.channels.cache.filter((c) => c.isTextBased()).size;
    const voiceChannels = guild.channels.cache.filter((c) => !c.isTextBased() && !("position" in c)).size;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 Statistiques de ${guild.name}`)
      .setThumbnail(guild.iconURL() || "")
      .addFields(
        { name: "👥 Membres totaux", value: `${totalMembers}`, inline: true },
        { name: "👤 Humains", value: `${humans}`, inline: true },
        { name: "🤖 Bots", value: `${bots}`, inline: true },
        { name: "🟢 En ligne", value: `${online}`, inline: true },
        { name: "💬 Salons textuels", value: `${textChannels}`, inline: true },
        { name: "🔊 Salons vocaux", value: `${voiceChannels}`, inline: true },
        { name: "📁 Total salons", value: `${channels}`, inline: true },
        { name: "🎭 Rôles", value: `${roles}`, inline: true },
        { name: "🎂 Créé le", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
      )
      .setFooter({ text: `ID: ${guild.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
