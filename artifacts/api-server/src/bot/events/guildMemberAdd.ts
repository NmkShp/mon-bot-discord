import {
  type GuildMember,
  EmbedBuilder,
  Colors,
  PermissionsBitField,
} from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";
import { sendLog, securityLogEmbed } from "../utils/logger";

export async function handleGuildMemberAdd(member: GuildMember, client: BotClient) {
  const config = store.getConfig(member.guild.id);
  const tracker = store.raidTracker;

  // Anti-raid detection
  if (config.antiRaidEnabled && config.protectEnabled) {
    const now = Date.now();
    const key = member.guild.id;
    const entry = tracker.get(key) || { joins: 0, lastJoin: now };

    if (now - entry.lastJoin < 10000) {
      entry.joins++;
    } else {
      entry.joins = 1;
      entry.lastJoin = now;
    }
    entry.lastJoin = now;
    tracker.set(key, entry);

    if (entry.joins >= 5) {
      const embed = securityLogEmbed(
        "⚠️ Anti-Raid Déclenché",
        `**${member.user.tag}** vient de rejoindre.\n` +
          `**${entry.joins} membres** ont rejoint en moins de 10 secondes !\n` +
          `Action : Vérification activée`
      );
      await sendLog(member.guild, embed);
    }
  }

  // Anti-bot
  if (config.antiBotEnabled && config.protectEnabled && member.user.bot) {
    const whitelist = config.whitelist || [];
    if (!whitelist.includes(member.user.id)) {
      try {
        await member.kick("Anti-Bot: bot non autorisé");
        const embed = securityLogEmbed(
          "🤖 Anti-Bot",
          `Le bot **${member.user.tag}** (\`${member.user.id}\`) a été expulsé automatiquement.`
        );
        await sendLog(member.guild, embed);
      } catch {
        // No permission
      }
      return;
    }
  }

  // Welcome message
  if (config.welcomeChannelId) {
    try {
      const channel = await member.guild.channels.fetch(config.welcomeChannelId);
      if (channel && channel.isTextBased() && "send" in channel) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("👋 Bienvenue !")
          .setDescription(
            `Bienvenue sur **${member.guild.name}**, ${member.user}!\n` +
              `Tu es le **${member.guild.memberCount}ème** membre !`
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }
    } catch {
      // Channel may not exist
    }
  }

  // Auto-role
  if (config.autoRoleId) {
    try {
      await member.roles.add(config.autoRoleId);
    } catch {
      // No permission or role doesn't exist
    }
  }
}
