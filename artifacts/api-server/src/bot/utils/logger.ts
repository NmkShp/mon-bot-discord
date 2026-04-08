import { EmbedBuilder, Colors, type Guild } from "discord.js";
import { store } from "../store";

export async function sendLog(guild: Guild, embed: EmbedBuilder) {
  const config = store.getConfig(guild.id);
  if (!config.logsChannelId) return;

  try {
    const channel = await guild.channels.fetch(config.logsChannelId);
    if (channel && channel.isTextBased() && "send" in channel) {
      await channel.send({ embeds: [embed] });
    }
  } catch {
    // Channel may have been deleted
  }
}

export function securityLogEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(`🔒 ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function modLogEmbed(
  action: string,
  moderator: string,
  target: string,
  reason: string
) {
  return new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle(`⚖️ Modération - ${action}`)
    .addFields(
      { name: "Modérateur", value: moderator, inline: true },
      { name: "Cible", value: target, inline: true },
      { name: "Raison", value: reason }
    )
    .setTimestamp();
}
