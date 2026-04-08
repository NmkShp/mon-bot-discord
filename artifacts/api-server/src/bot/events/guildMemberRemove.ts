import { type GuildMember, type PartialGuildMember, EmbedBuilder } from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";

export async function handleGuildMemberRemove(
  member: GuildMember | PartialGuildMember,
  client: BotClient
) {
  const config = store.getConfig(member.guild.id);

  if (config.goodbyeChannelId) {
    try {
      const channel = await member.guild.channels.fetch(config.goodbyeChannelId);
      if (channel && channel.isTextBased() && "send" in channel) {
        const embed = new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle("👋 Au revoir !")
          .setDescription(
            `**${member.user?.tag ?? "Un membre"}** a quitté le serveur.\n` +
              `Il reste **${member.guild.memberCount}** membres.`
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }
    } catch {
      // Channel may not exist
    }
  }
}
