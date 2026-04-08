import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  Events,
  type ChatInputCommandInteraction,
  type Interaction,
  type GuildMember,
  type Message,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type TextChannel,
  type Role,
} from "discord.js";

const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1463612710989336657";
const GUILD_ID = process.env.DISCORD_GUILD_ID || "1377601002072576140";
const PORT = process.env.PORT || "8080";

// ─── STORE ───────────────────────────────────────────────────────────────────
interface TicketData { channelId: string; userId: string; guildId: string; service?: string; createdAt: Date; claimedBy?: string; closed?: boolean; }
interface GuildConfig { guildId: string; logsChannelId?: string; ticketCategoryId?: string; welcomeChannelId?: string; goodbyeChannelId?: string; autoRoleId?: string; staffRoleId?: string; suggestChannelId?: string; protectEnabled?: boolean; antiSpamEnabled?: boolean; antiRaidEnabled?: boolean; antiBotEnabled?: boolean; antiLinkEnabled?: boolean; antiMassMentionEnabled?: boolean; whitelist?: string[]; }

const tickets = new Map<string, TicketData>();
const configs = new Map<string, GuildConfig>();
const spamTracker = new Map<string, { count: number; last: number }>();
const raidTracker = new Map<string, { joins: number; last: number }>();
const actionTracker = new Map<string, { count: number; last: number }>();
const warnings = new Map<string, { reason: string; by: string; date: Date }[]>();

function getConfig(guildId: string): GuildConfig {
  if (!configs.has(guildId)) configs.set(guildId, { guildId, protectEnabled: true, antiSpamEnabled: true, antiRaidEnabled: true, antiBotEnabled: true, antiLinkEnabled: false, antiMassMentionEnabled: true, whitelist: [] });
  return configs.get(guildId)!;
}

// ─── EMBEDS ──────────────────────────────────────────────────────────────────
const ok = (t: string, d: string) => new EmbedBuilder().setColor(Colors.Green).setTitle(`✅ ${t}`).setDescription(d).setTimestamp();
const err = (t: string, d: string) => new EmbedBuilder().setColor(Colors.Red).setTitle(`❌ ${t}`).setDescription(d).setTimestamp();
const info = (t: string, d: string) => new EmbedBuilder().setColor(0x5865f2).setTitle(`ℹ️ ${t}`).setDescription(d).setTimestamp();

async function sendLog(guildId: string, embed: EmbedBuilder) {
  const cfg = getConfig(guildId);
  if (!cfg.logsChannelId) return;
  try {
    const ch = await client.channels.fetch(cfg.logsChannelId);
    if (ch && "send" in ch) await (ch as any).send({ embeds: [embed] });
  } catch {}
}

// ─── CLIENT ──────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildBans, GatewayIntentBits.GuildModeration, GatewayIntentBits.DirectMessages],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
}) as Client & { commands: Collection<string, any> };
client.commands = new Collection();

// ─── COMMANDS ────────────────────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("ticket-panel").setDescription("Envoie le panel de tickets").addChannelOption(o => o.setName("salon").setDescription("Salon").setRequired(false)),
  new SlashCommandBuilder().setName("ticket-close").setDescription("Ferme le ticket actuel"),
  new SlashCommandBuilder().setName("ticket-add").setDescription("Ajoute un membre au ticket").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)),
  new SlashCommandBuilder().setName("ticket-remove").setDescription("Retire un membre du ticket").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)),
  new SlashCommandBuilder().setName("protect-config").setDescription("Configure la protection")
    .addSubcommand(s => s.setName("status").setDescription("Voir le statut"))
    .addSubcommand(s => s.setName("toggle").setDescription("Activer/désactiver un module").addStringOption(o => o.setName("module").setDescription("Module").setRequired(true).addChoices({ name: "Protection globale", value: "protectEnabled" }, { name: "Anti-Spam", value: "antiSpamEnabled" }, { name: "Anti-Raid", value: "antiRaidEnabled" }, { name: "Anti-Bot", value: "antiBotEnabled" }, { name: "Anti-Liens", value: "antiLinkEnabled" }, { name: "Anti-Mass Mention", value: "antiMassMentionEnabled" })).addBooleanOption(o => o.setName("activer").setDescription("Activer ou désactiver").setRequired(true)))
    .addSubcommand(s => s.setName("whitelist-add").setDescription("Ajouter à la whitelist").addUserOption(o => o.setName("utilisateur").setDescription("Utilisateur").setRequired(true)))
    .addSubcommand(s => s.setName("whitelist-remove").setDescription("Retirer de la whitelist").addUserOption(o => o.setName("utilisateur").setDescription("Utilisateur").setRequired(true))),
  new SlashCommandBuilder().setName("logs-config").setDescription("Configure le salon des logs").addChannelOption(o => o.setName("salon").setDescription("Salon").setRequired(true)),
  new SlashCommandBuilder().setName("welcome-config").setDescription("Configure le système de bienvenue")
    .addSubcommand(s => s.setName("welcome").setDescription("Salon de bienvenue").addChannelOption(o => o.setName("salon").setDescription("Salon").setRequired(true)))
    .addSubcommand(s => s.setName("goodbye").setDescription("Salon d'au revoir").addChannelOption(o => o.setName("salon").setDescription("Salon").setRequired(true)))
    .addSubcommand(s => s.setName("ticket-category").setDescription("Catégorie pour les tickets").addChannelOption(o => o.setName("categorie").setDescription("Catégorie").setRequired(true))),
  new SlashCommandBuilder().setName("autorole-config").setDescription("Configure le rôle automatique")
    .addSubcommand(s => s.setName("set").setDescription("Définir le rôle auto").addRoleOption(o => o.setName("role").setDescription("Rôle").setRequired(true)))
    .addSubcommand(s => s.setName("remove").setDescription("Retirer le rôle auto"))
    .addSubcommand(s => s.setName("staff").setDescription("Rôle staff pour les tickets").addRoleOption(o => o.setName("role").setDescription("Rôle").setRequired(true))),
  new SlashCommandBuilder().setName("ban").setDescription("Bannir un membre").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)).addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder().setName("kick").setDescription("Expulser un membre").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)).addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder().setName("mute").setDescription("Mute un membre").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)).addIntegerOption(o => o.setName("duree").setDescription("Durée en minutes").setRequired(true).setMinValue(1).setMaxValue(40320)).addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)),
  new SlashCommandBuilder().setName("unmute").setDescription("Retire le timeout d'un membre").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)),
  new SlashCommandBuilder().setName("warn").setDescription("Gérer les avertissements")
    .addSubcommand(s => s.setName("add").setDescription("Ajouter un avertissement").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)).addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(true)))
    .addSubcommand(s => s.setName("list").setDescription("Voir les avertissements").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true)))
    .addSubcommand(s => s.setName("clear").setDescription("Effacer les avertissements").addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))),
  new SlashCommandBuilder().setName("clear").setDescription("Supprimer des messages").addIntegerOption(o => o.setName("nombre").setDescription("Nombre (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName("stats").setDescription("Statistiques du serveur"),
  new SlashCommandBuilder().setName("suggest").setDescription("Soumettre une suggestion").addStringOption(o => o.setName("suggestion").setDescription("Ta suggestion").setRequired(true)),
  new SlashCommandBuilder().setName("giveaway").setDescription("Système de giveaway")
    .addSubcommand(s => s.setName("start").setDescription("Lancer un giveaway").addStringOption(o => o.setName("lot").setDescription("Lot").setRequired(true)).addIntegerOption(o => o.setName("duree").setDescription("Durée en minutes").setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName("end").setDescription("Terminer un giveaway").addStringOption(o => o.setName("id").setDescription("ID du message").setRequired(true))),
];

// ─── REGISTER COMMANDS ────────────────────────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands.map(c => c.toJSON()) });
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands.map(c => c.toJSON()) });
  console.log("✅ Slash commands enregistrées globalement + serveur principal");
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot connecté : ${c.user.tag}`);
  c.user.setActivity("🛡️ Protection du serveur");
  try { await registerCommands(); } catch (e) { console.error("Erreur enregistrement commandes:", e); }
});

client.on(Events.GuildMemberAdd, async (member) => {
  const cfg = getConfig(member.guild.id);
  // Anti-raid
  if (cfg.antiRaidEnabled && cfg.protectEnabled) {
    const key = member.guild.id;
    const now = Date.now();
    const e = raidTracker.get(key) || { joins: 0, last: now };
    e.joins = now - e.last < 10000 ? e.joins + 1 : 1;
    e.last = now;
    raidTracker.set(key, e);
    if (e.joins >= 5) await sendLog(member.guild.id, new EmbedBuilder().setColor(Colors.Red).setTitle("⚠️ Anti-Raid").setDescription(`**${e.joins}** membres ont rejoint en moins de 10s !`).setTimestamp());
  }
  // Anti-bot
  if (cfg.antiBotEnabled && cfg.protectEnabled && member.user.bot && !(cfg.whitelist || []).includes(member.user.id)) {
    try { await member.kick("Anti-Bot"); await sendLog(member.guild.id, new EmbedBuilder().setColor(Colors.Red).setTitle("🤖 Anti-Bot").setDescription(`Bot **${member.user.tag}** expulsé automatiquement.`).setTimestamp()); } catch {}
    return;
  }
  // Welcome
  if (cfg.welcomeChannelId) {
    try {
      const ch = await member.guild.channels.fetch(cfg.welcomeChannelId);
      if (ch && "send" in ch) await (ch as any).send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("👋 Bienvenue !").setDescription(`Bienvenue sur **${member.guild.name}**, ${member.user} !\nTu es le **${member.guild.memberCount}ème** membre !`).setThumbnail(member.user.displayAvatarURL()).setTimestamp()] });
    } catch {}
  }
  // Auto-role
  if (cfg.autoRoleId) { try { await member.roles.add(cfg.autoRoleId); } catch {} }
});

client.on(Events.GuildMemberRemove, async (member) => {
  const cfg = getConfig(member.guild.id);
  if (!cfg.goodbyeChannelId) return;
  try {
    const ch = await member.guild.channels.fetch(cfg.goodbyeChannelId);
    if (ch && "send" in ch) await (ch as any).send({ embeds: [new EmbedBuilder().setColor(0xff6b6b).setTitle("👋 Au revoir !").setDescription(`**${member.user?.tag ?? "Un membre"}** a quitté le serveur. Il reste **${member.guild.memberCount}** membres.`).setTimestamp()] });
  } catch {}
});

const LINK_RE = /(discord\.gg|discordapp\.com\/invite|bit\.ly|tinyurl|grabify|iplogger)/i;
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || !msg.guild) return;
  const cfg = getConfig(msg.guild.id);
  if (!cfg.protectEnabled) return;
  if ((cfg.whitelist || []).includes(msg.author.id)) return;
  const now = Date.now();
  // Anti-spam
  if (cfg.antiSpamEnabled) {
    const key = `${msg.guild.id}-${msg.author.id}`;
    const e = spamTracker.get(key) || { count: 0, last: now };
    e.count = now - e.last < 3000 ? e.count + 1 : 1;
    e.last = now;
    spamTracker.set(key, e);
    if (e.count >= 5) {
      try { await msg.delete(); const m = await msg.guild.members.fetch(msg.author.id); await m.timeout(600000, "Anti-spam"); e.count = 0; spamTracker.set(key, e); await sendLog(msg.guild.id, new EmbedBuilder().setColor(Colors.Red).setTitle("🚫 Anti-Spam").setDescription(`**${msg.author.tag}** - ${e.count} messages en 3s. Timeout 10min.`).setTimestamp()); } catch {}
      return;
    }
  }
  // Anti-mass mention
  if (cfg.antiMassMentionEnabled && msg.mentions.users.size >= 5) {
    try { await msg.delete(); const m = await msg.guild.members.fetch(msg.author.id); await m.timeout(300000, "Anti-mass mention"); await sendLog(msg.guild.id, new EmbedBuilder().setColor(Colors.Red).setTitle("🚫 Anti-Mass Mention").setDescription(`**${msg.author.tag}** a mentionné ${msg.mentions.users.size} membres.`).setTimestamp()); } catch {}
    return;
  }
  // Anti-link
  if (cfg.antiLinkEnabled && LINK_RE.test(msg.content)) {
    try { await msg.delete(); await sendLog(msg.guild.id, new EmbedBuilder().setColor(Colors.Red).setTitle("🔗 Anti-Lien").setDescription(`Lien supprimé de **${msg.author.tag}**.`).setTimestamp()); } catch {}
  }
});

client.on(Events.GuildBanAdd, async (ban) => {
  const key = `ban-${ban.guild.id}`;
  const now = Date.now();
  const e = actionTracker.get(key) || { count: 0, last: now };
  e.count = now - e.last < 10000 ? e.count + 1 : 1;
  e.last = now;
  actionTracker.set(key, e);
  if (e.count >= 3) await sendLog(ban.guild.id, new EmbedBuilder().setColor(Colors.Red).setTitle("⚠️ Anti-Ban Massif").setDescription(`${e.count} bans en moins de 10s ! Dernier : **${ban.user.tag}**`).setTimestamp());
});

// ─── INTERACTIONS ────────────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    if (interaction.isChatInputCommand()) await handleCommand(interaction);
    else if (interaction.isButton()) await handleButton(interaction);
    else if (interaction.isStringSelectMenu()) await handleSelect(interaction);
  } catch (e) { console.error(e); }
});

async function handleCommand(i: ChatInputCommandInteraction) {
  const g = i.guild!;
  const cfg = getConfig(g.id);

  switch (i.commandName) {
    case "ticket-panel": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) { await i.reply({ embeds: [err("Permission refusée", "Tu n'as pas les permissions.")], ephemeral: true }); return; }
      const ch = (i.options.getChannel("salon") || i.channel) as TextChannel;
      const btn = new ButtonBuilder().setCustomId("ticket_create").setLabel("🎫 Créer un Ticket").setStyle(ButtonStyle.Primary);
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("🎫 Système de Tickets").setDescription("Clique sur le bouton ci-dessous pour ouvrir un ticket privé.\n\n**Services :** Nitro Boost • Server Boost • Graphisme • Comptes • Membres • Tools • Support • Autre").setTimestamp();
      await (ch as any).send({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(btn)] });
      await i.reply({ content: `✅ Panel envoyé dans ${ch}`, ephemeral: true });
      break;
    }
    case "ticket-close": {
      const t = tickets.get(i.channelId);
      if (!t) { await i.reply({ embeds: [err("Erreur", "Ce salon n'est pas un ticket.")], ephemeral: true }); return; }
      await i.reply({ embeds: [new EmbedBuilder().setColor(Colors.Orange).setTitle("🔒 Fermeture").setDescription("Ticket supprimé dans 5 secondes...").setTimestamp()] });
      t.closed = true;
      await sendLog(g.id, new EmbedBuilder().setColor(Colors.Red).setTitle("🎫 Ticket Fermé").setDescription(`Fermé par ${i.user} dans <#${i.channelId}>`).setTimestamp());
      setTimeout(async () => { try { await i.channel?.delete(); } catch {} }, 5000);
      break;
    }
    case "ticket-add": case "ticket-remove": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) { await i.reply({ embeds: [err("Permission refusée", "Permissions insuffisantes.")], ephemeral: true }); return; }
      const t = tickets.get(i.channelId);
      if (!t) { await i.reply({ embeds: [err("Erreur", "Ce salon n'est pas un ticket.")], ephemeral: true }); return; }
      const user = i.options.getUser("membre", true);
      const member = await g.members.fetch(user.id);
      const ch = i.channel as any;
      if (i.commandName === "ticket-add") {
        await ch.permissionOverwrites.create(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await i.reply({ embeds: [ok("Membre ajouté", `${user} ajouté au ticket.`)] });
      } else {
        await ch.permissionOverwrites.delete(member);
        await i.reply({ embeds: [ok("Membre retiré", `${user} retiré du ticket.`)] });
      }
      break;
    }
    case "protect-config": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) { await i.reply({ embeds: [err("Permission refusée", "Administrateur requis.")], ephemeral: true }); return; }
      const sub = i.options.getSubcommand();
      if (sub === "status") {
        await i.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🛡️ Protection").addFields({ name: "Globale", value: cfg.protectEnabled ? "✅" : "❌", inline: true }, { name: "Anti-Spam", value: cfg.antiSpamEnabled ? "✅" : "❌", inline: true }, { name: "Anti-Raid", value: cfg.antiRaidEnabled ? "✅" : "❌", inline: true }, { name: "Anti-Bot", value: cfg.antiBotEnabled ? "✅" : "❌", inline: true }, { name: "Anti-Liens", value: cfg.antiLinkEnabled ? "✅" : "❌", inline: true }, { name: "Anti-Mention", value: cfg.antiMassMentionEnabled ? "✅" : "❌", inline: true }).setTimestamp()], ephemeral: true });
      } else if (sub === "toggle") {
        const mod = i.options.getString("module", true) as keyof GuildConfig;
        const val = i.options.getBoolean("activer", true);
        configs.set(g.id, { ...cfg, [mod]: val });
        await i.reply({ embeds: [ok("Protection", `**${mod}** : ${val ? "✅ Activé" : "❌ Désactivé"}`)], ephemeral: true });
      } else if (sub === "whitelist-add") {
        const user = i.options.getUser("utilisateur", true);
        const wl = [...(cfg.whitelist || [])];
        if (!wl.includes(user.id)) wl.push(user.id);
        configs.set(g.id, { ...cfg, whitelist: wl });
        await i.reply({ embeds: [ok("Whitelist", `${user} ajouté à la whitelist.`)], ephemeral: true });
      } else {
        const user = i.options.getUser("utilisateur", true);
        configs.set(g.id, { ...cfg, whitelist: (cfg.whitelist || []).filter(id => id !== user.id) });
        await i.reply({ embeds: [ok("Whitelist", `${user} retiré de la whitelist.`)], ephemeral: true });
      }
      break;
    }
    case "logs-config": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) { await i.reply({ embeds: [err("Permission refusée", "Administrateur requis.")], ephemeral: true }); return; }
      const ch = i.options.getChannel("salon", true);
      configs.set(g.id, { ...cfg, logsChannelId: ch.id });
      await i.reply({ embeds: [ok("Logs", `Logs configurés dans <#${ch.id}>.`)], ephemeral: true });
      break;
    }
    case "welcome-config": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) { await i.reply({ embeds: [err("Permission refusée", "Administrateur requis.")], ephemeral: true }); return; }
      const sub = i.options.getSubcommand();
      if (sub === "welcome") { const ch = i.options.getChannel("salon", true); configs.set(g.id, { ...cfg, welcomeChannelId: ch.id }); await i.reply({ embeds: [ok("Bienvenue", `Messages de bienvenue dans <#${ch.id}>.`)], ephemeral: true }); }
      else if (sub === "goodbye") { const ch = i.options.getChannel("salon", true); configs.set(g.id, { ...cfg, goodbyeChannelId: ch.id }); await i.reply({ embeds: [ok("Au revoir", `Messages d'au revoir dans <#${ch.id}>.`)], ephemeral: true }); }
      else { const ch = i.options.getChannel("categorie", true); configs.set(g.id, { ...cfg, ticketCategoryId: ch.id }); await i.reply({ embeds: [ok("Catégorie", `Tickets créés dans la catégorie **${ch.name}**.`)], ephemeral: true }); }
      break;
    }
    case "autorole-config": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) { await i.reply({ embeds: [err("Permission refusée", "Administrateur requis.")], ephemeral: true }); return; }
      const sub = i.options.getSubcommand();
      if (sub === "set") { const role = i.options.getRole("role", true) as Role; configs.set(g.id, { ...cfg, autoRoleId: role.id }); await i.reply({ embeds: [ok("Auto-rôle", `**${role.name}** attribué aux nouveaux membres.`)], ephemeral: true }); }
      else if (sub === "remove") { configs.set(g.id, { ...cfg, autoRoleId: undefined }); await i.reply({ embeds: [ok("Auto-rôle", "Rôle automatique désactivé.")], ephemeral: true }); }
      else { const role = i.options.getRole("role", true) as Role; configs.set(g.id, { ...cfg, staffRoleId: role.id }); await i.reply({ embeds: [ok("Rôle staff", `**${role.name}** aura accès aux tickets.`)], ephemeral: true }); }
      break;
    }
    case "ban": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.BanMembers)) { await i.reply({ embeds: [err("Permission refusée", "Permission Ban requis.")], ephemeral: true }); return; }
      const user = i.options.getUser("membre", true);
      const reason = i.options.getString("raison") || "Aucune raison";
      try { await g.members.ban(user, { reason }); await i.reply({ embeds: [ok("Ban", `**${user.tag}** banni. Raison : ${reason}`)] }); await sendLog(g.id, new EmbedBuilder().setColor(Colors.Orange).setTitle("⚖️ Ban").addFields({ name: "Modérateur", value: i.user.tag, inline: true }, { name: "Cible", value: user.tag, inline: true }, { name: "Raison", value: reason }).setTimestamp()); } catch { await i.reply({ embeds: [err("Erreur", "Impossible de bannir.")], ephemeral: true }); }
      break;
    }
    case "kick": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.KickMembers)) { await i.reply({ embeds: [err("Permission refusée", "Permission Kick requis.")], ephemeral: true }); return; }
      const user = i.options.getUser("membre", true);
      const reason = i.options.getString("raison") || "Aucune raison";
      try { const m = await g.members.fetch(user.id); await m.kick(reason); await i.reply({ embeds: [ok("Kick", `**${user.tag}** expulsé. Raison : ${reason}`)] }); await sendLog(g.id, new EmbedBuilder().setColor(Colors.Orange).setTitle("⚖️ Kick").addFields({ name: "Modérateur", value: i.user.tag, inline: true }, { name: "Cible", value: user.tag, inline: true }, { name: "Raison", value: reason }).setTimestamp()); } catch { await i.reply({ embeds: [err("Erreur", "Impossible d'expulser.")], ephemeral: true }); }
      break;
    }
    case "mute": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)) { await i.reply({ embeds: [err("Permission refusée", "Permission Modérer requis.")], ephemeral: true }); return; }
      const user = i.options.getUser("membre", true);
      const dur = i.options.getInteger("duree", true);
      const reason = i.options.getString("raison") || "Aucune raison";
      try { const m = await g.members.fetch(user.id); await m.timeout(dur * 60000, reason); await i.reply({ embeds: [ok("Mute", `**${user.tag}** muté ${dur} minutes.`)] }); await sendLog(g.id, new EmbedBuilder().setColor(Colors.Orange).setTitle("⚖️ Mute").addFields({ name: "Modérateur", value: i.user.tag, inline: true }, { name: "Cible", value: user.tag, inline: true }, { name: "Durée", value: `${dur}min`, inline: true }).setTimestamp()); } catch { await i.reply({ embeds: [err("Erreur", "Impossible de mute.")], ephemeral: true }); }
      break;
    }
    case "unmute": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)) { await i.reply({ embeds: [err("Permission refusée", "Permission Modérer requis.")], ephemeral: true }); return; }
      const user = i.options.getUser("membre", true);
      try { const m = await g.members.fetch(user.id); await m.timeout(null); await i.reply({ embeds: [ok("Unmute", `**${user.tag}** n'est plus muté.`)] }); } catch { await i.reply({ embeds: [err("Erreur", "Impossible de retirer le timeout.")], ephemeral: true }); }
      break;
    }
    case "warn": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)) { await i.reply({ embeds: [err("Permission refusée", "Permission Modérer requis.")], ephemeral: true }); return; }
      const sub = i.options.getSubcommand();
      const user = i.options.getUser("membre", true);
      const key = `${g.id}-${user.id}`;
      if (sub === "add") {
        const reason = i.options.getString("raison", true);
        const w = warnings.get(key) || [];
        w.push({ reason, by: i.user.tag, date: new Date() });
        warnings.set(key, w);
        await i.reply({ embeds: [ok("Avertissement", `**${user.tag}** averti. Raison : ${reason}\nTotal : **${w.length}** warn(s)`)] });
        try { await user.send({ embeds: [new EmbedBuilder().setColor(Colors.Orange).setTitle(`⚠️ Avertissement - ${g.name}`).setDescription(`Raison : ${reason}`).setTimestamp()] }); } catch {}
      } else if (sub === "list") {
        const w = warnings.get(key) || [];
        await i.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`⚠️ Warns de ${user.tag}`).setDescription(w.length ? w.map((x, i) => `**${i + 1}.** ${x.reason} *(par ${x.by})*`).join("\n") : "Aucun avertissement").setTimestamp()], ephemeral: true });
      } else {
        warnings.delete(key);
        await i.reply({ embeds: [ok("Warns effacés", `Avertissements de **${user.tag}** supprimés.`)], ephemeral: true });
      }
      break;
    }
    case "clear": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) { await i.reply({ embeds: [err("Permission refusée", "Permission Gérer les messages requis.")], ephemeral: true }); return; }
      const n = i.options.getInteger("nombre", true);
      await i.deferReply({ ephemeral: true });
      try { const msgs = await (i.channel as any).messages.fetch({ limit: n }); const deleted = await (i.channel as any).bulkDelete(msgs, true); await i.editReply({ content: `✅ **${deleted.size}** message(s) supprimé(s).` }); } catch { await i.editReply({ content: "❌ Impossible (messages trop anciens ou erreur)." }); }
      break;
    }
    case "stats": {
      await g.members.fetch();
      const humans = g.members.cache.filter(m => !m.user.bot).size;
      const bots = g.members.cache.filter(m => m.user.bot).size;
      await i.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`📊 ${g.name}`).setThumbnail(g.iconURL() || "").addFields({ name: "👥 Membres", value: `${g.memberCount}`, inline: true }, { name: "👤 Humains", value: `${humans}`, inline: true }, { name: "🤖 Bots", value: `${bots}`, inline: true }, { name: "💬 Salons", value: `${g.channels.cache.size}`, inline: true }, { name: "🎭 Rôles", value: `${g.roles.cache.size}`, inline: true }, { name: "🎂 Créé le", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true }).setTimestamp()] });
      break;
    }
    case "suggest": {
      const suggestion = i.options.getString("suggestion", true);
      const ch = i.channel as any;
      const embed = new EmbedBuilder().setColor(Colors.Blue).setTitle("💡 Suggestion").setDescription(suggestion).addFields({ name: "Proposé par", value: `${i.user}` }).setTimestamp();
      const msg = await ch.send({ embeds: [embed] });
      await msg.react("👍"); await msg.react("👎");
      await i.reply({ content: "✅ Suggestion envoyée !", ephemeral: true });
      break;
    }
    case "giveaway": {
      if (!i.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) { await i.reply({ embeds: [err("Permission refusée", "Permission Gérer le serveur requis.")], ephemeral: true }); return; }
      const sub = i.options.getSubcommand();
      if (sub === "start") {
        const prize = i.options.getString("lot", true);
        const dur = i.options.getInteger("duree", true);
        const endTime = Date.now() + dur * 60000;
        const embed = new EmbedBuilder().setColor(Colors.Gold).setTitle("🎉 GIVEAWAY 🎉").setDescription(`**Lot :** ${prize}\n**Fin :** <t:${Math.floor(endTime / 1000)}:R>\n**Par :** ${i.user}\n\nClique sur 🎉 pour participer !`).setTimestamp(endTime);
        const btn = new ButtonBuilder().setCustomId("giveaway_enter").setLabel("🎉 Participer").setStyle(ButtonStyle.Primary);
        await i.reply({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(btn)] });
        const giveaways = new Map<string, Set<string>>();
        const msg = await i.fetchReply();
        giveaways.set(msg.id, new Set());
        setTimeout(async () => {
          const entries = [...(giveaways.get(msg.id) || [])];
          const winner = entries.length ? entries[Math.floor(Math.random() * entries.length)] : null;
          await (i.channel as any).send({ embeds: [new EmbedBuilder().setColor(Colors.Gold).setTitle("🎉 Giveaway terminé !").setDescription(winner ? `Gagnant : <@${winner}> — **${prize}**` : "Aucun participant.").setTimestamp()] });
        }, dur * 60000);
      } else {
        await i.reply({ embeds: [info("Giveaway", "Giveaway terminé manuellement.")] });
      }
      break;
    }
  }
}

async function handleButton(i: ButtonInteraction) {
  if (i.customId === "ticket_create") {
    await i.deferReply({ ephemeral: true });
    const g = i.guild!;
    const cfg = getConfig(g.id);
    const existing = [...tickets.values()].find(t => t.userId === i.user.id && t.guildId === g.id && !t.closed);
    if (existing) { await i.editReply({ content: `Tu as déjà un ticket ouvert : <#${existing.channelId}>` }); return; }
    try {
      const perms = [{ id: g.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }, { id: client.user!.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory] }] as any[];
      if (cfg.staffRoleId) perms.push({ id: cfg.staffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
      const ch = await g.channels.create({ name: `ticket-${i.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15)}-${tickets.size + 1}`, type: ChannelType.GuildText, permissionOverwrites: perms, ...(cfg.ticketCategoryId ? { parent: cfg.ticketCategoryId } : {}) });
      tickets.set(ch.id, { channelId: ch.id, userId: i.user.id, guildId: g.id, createdAt: new Date() });
      const select = new StringSelectMenuBuilder().setCustomId("ticket_service").setPlaceholder("Sélectionne un service...").addOptions([{ label: "🚀 Nitro Boost", value: "Nitro Boost" }, { label: "💎 Server Boost", value: "Server Boost" }, { label: "🎨 Graphisme", value: "Graphisme" }, { label: "👤 Comptes (ACC)", value: "Comptes" }, { label: "👥 Membres", value: "Membres" }, { label: "🔧 Tools", value: "Tools" }, { label: "❓ Questions / Support", value: "Support" }, { label: "📌 Autre", value: "Autre" }]);
      const closeBtn = new ButtonBuilder().setCustomId("ticket_close_btn").setLabel("Fermer").setStyle(ButtonStyle.Danger).setEmoji("🔒");
      const claimBtn = new ButtonBuilder().setCustomId("ticket_claim_btn").setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji("✋");
      const transcriptBtn = new ButtonBuilder().setCustomId("ticket_transcript_btn").setLabel("Transcription").setStyle(ButtonStyle.Secondary).setEmoji("📄");
      await ch.send({ content: `${i.user} Bienvenue dans ton ticket !`, embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🎫 Ticket de Support").setDescription("Sélectionne la catégorie de ta demande ci-dessous.\n\nUn membre du staff te répondra bientôt.").addFields({ name: "Ouvert par", value: `${i.user}` }).setTimestamp()], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), new ActionRowBuilder<ButtonBuilder>().addComponents(closeBtn, claimBtn, transcriptBtn)] });
      await i.editReply({ content: `✅ Ticket créé : ${ch}` });
      await sendLog(g.id, new EmbedBuilder().setColor(Colors.Green).setTitle("🎫 Ticket Créé").addFields({ name: "Utilisateur", value: `${i.user}`, inline: true }, { name: "Salon", value: `${ch}`, inline: true }).setTimestamp());
    } catch { await i.editReply({ content: "❌ Impossible de créer le ticket. Vérifie mes permissions." }); }
  } else if (i.customId === "ticket_close_btn") {
    const t = tickets.get(i.channelId);
    if (!t) { await i.reply({ content: "Ce salon n'est pas un ticket.", ephemeral: true }); return; }
    await i.reply({ embeds: [new EmbedBuilder().setColor(Colors.Orange).setTitle("🔒 Fermeture").setDescription("Suppression dans 5 secondes...").setTimestamp()] });
    t.closed = true;
    await sendLog(i.guild!.id, new EmbedBuilder().setColor(Colors.Red).setTitle("🎫 Ticket Fermé").setDescription(`Fermé par ${i.user}`).setTimestamp());
    setTimeout(async () => { try { await i.channel?.delete(); } catch {} }, 5000);
  } else if (i.customId === "ticket_claim_btn") {
    const t = tickets.get(i.channelId);
    if (!t) return;
    if (t.claimedBy) { await i.reply({ content: `Déjà réclamé par <@${t.claimedBy}>`, ephemeral: true }); return; }
    t.claimedBy = i.user.id;
    await i.reply({ embeds: [ok("Ticket Réclamé", `${i.user} prend en charge ce ticket !`)] });
  } else if (i.customId === "ticket_transcript_btn") {
    await i.deferReply({ ephemeral: true });
    try {
      const msgs = await (i.channel as any).messages.fetch({ limit: 100 });
      const sorted = [...msgs.values()].reverse();
      const text = sorted.map((m: Message) => `[${m.createdAt.toLocaleString("fr-FR")}] ${m.author.tag}: ${m.content || "[Embed]"}`).join("\n");
      await sendLog(i.guild!.id, new EmbedBuilder().setColor(0x5865f2).setTitle("📄 Transcription").setDescription(`\`\`\`\n${text.substring(0, 3900)}\n\`\`\``).setTimestamp());
      await i.editReply({ content: "✅ Transcription envoyée dans les logs." });
    } catch { await i.editReply({ content: "❌ Impossible de générer la transcription." }); }
  }
}

async function handleSelect(i: StringSelectMenuInteraction) {
  if (i.customId !== "ticket_service") return;
  const service = i.values[0];
  const t = tickets.get(i.channelId);
  if (t) { t.service = service; tickets.set(i.channelId, t); }
  const questions: Record<string, string[]> = {
    "Nitro Boost": ["Quel type de boost veux-tu ? (Nitro Classic ou Nitro)", "Quel est ton budget ?", "Quel est le délai souhaité ?"],
    "Server Boost": ["Combien de boosts souhaites-tu ?", "Quel est ton budget ?", "Quel est l'ID de ton serveur ?"],
    "Graphisme": ["Quel type de graphisme ? (logo, bannière, avatar...)", "Quel est ton budget ?", "Décris ton projet :"],
    "Comptes": ["Quel type de compte recherches-tu ?", "Quel est ton budget ?", "Des exigences spécifiques ?"],
    "Membres": ["Combien de membres souhaites-tu ?", "Quel type de membres ?", "Quel est ton budget ?"],
    "Tools": ["Quel outil ou service recherches-tu ?", "Quel est ton budget ?", "Délai souhaité ?"],
    "Support": ["Quelle est ta question ou ton problème ?", "As-tu essayé des solutions ? Si oui, lesquelles ?"],
    "Autre": ["Quel service recherches-tu ?", "Quel est ton budget (si applicable) ?", "Détails supplémentaires ?"],
  };
  const qs = questions[service] || questions["Autre"];
  await i.update({ components: [] });
  if (i.channel && "send" in i.channel) {
    await (i.channel as any).send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`📋 Service : ${service}`).setDescription("Réponds aux questions suivantes :\n\n" + qs.map((q, idx) => `**${idx + 1}.** ${q}`).join("\n")).setTimestamp()] });
  }
}

// ─── KEEP-ALIVE HTTP SERVER ───────────────────────────────────────────────────
import { createServer } from "http";
createServer((_, res) => { res.writeHead(200); res.end("Bot en ligne ✅"); }).listen(PORT, () => console.log(`🌐 HTTP server on port ${PORT}`));

// ─── START ───────────────────────────────────────────────────────────────────
client.login(TOKEN).catch(console.error);
