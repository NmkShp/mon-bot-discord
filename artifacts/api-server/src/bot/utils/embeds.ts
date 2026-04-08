import { EmbedBuilder, Colors } from "discord.js";

export function successEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function errorEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function infoEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function warningEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function ticketEmbed(service?: string) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎫 Ticket de Support")
    .setDescription(
      `Bienvenue dans votre ticket${service ? ` - **${service}**` : ""}!\n\n` +
        "Veuillez sélectionner la catégorie de votre demande ci-dessous et répondre aux questions posées par le bot.\n\n" +
        "Un membre du staff vous répondra dans les plus brefs délais."
    )
    .setFooter({ text: "Support • Utilisez les boutons ci-dessous" })
    .setTimestamp();
}

export function panelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎫 Système de Tickets")
    .setDescription(
      "Besoin d'aide ou d'un service ?\n\n" +
        "Cliquez sur le bouton **Créer un Ticket** ci-dessous pour ouvrir un ticket privé avec notre équipe.\n\n" +
        "**Services disponibles :**\n" +
        "🚀 Nitro Boost\n" +
        "💎 Server Boost\n" +
        "🎨 Graphisme\n" +
        "👤 Comptes (ACC)\n" +
        "👥 Membres\n" +
        "🔧 Tools\n" +
        "❓ Questions / Support\n" +
        "📌 Autre"
    )
    .setFooter({ text: "Ouvrez un ticket pour être pris en charge" })
    .setTimestamp();
}

export function logEmbed(action: string, description: string, color = Colors.Blue) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`📋 ${action}`)
    .setDescription(description)
    .setTimestamp();
}
