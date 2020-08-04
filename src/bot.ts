import { Client } from "discord.js";
import { container } from "tsyringe";
import { MongoCluster } from "./database/mongoCluster";
import { SettingsManager } from "./database/managers/settings/settingsManager";
import { GuildManager } from "./database/managers/main/guildManager";
import { UserManager } from "./database/managers/main/userManager";
import { CommandModule } from "./commands/commandModule";
import { SettingsWrapper } from "./database/wrappers/settings/settingsWrapper";

export interface BotConfig {
    mongoUri: string;
    logMetadata?: boolean;
}

export class Bot {

    client: Client;
    guildManager: GuildManager;
    userManager: UserManager;
    commandModule: CommandModule;

    constructor(config: BotConfig) {
        container.register(MongoCluster, { useValue: new MongoCluster(config.mongoUri) });
    }

    async init() {
        this.client = new Client({
            disableMentions: 'everyone',
            partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION']
        });
        container.register(Client, { useValue: this.client });

        let settingsManager = container.resolve(SettingsManager);
        let settings = await settingsManager.fetch(null);
        container.register(SettingsWrapper, { useValue: settings });

        this.guildManager = container.resolve(GuildManager);
        this.userManager = container.resolve(UserManager);
        this.commandModule = container.resolve(CommandModule);

        this.client.login(settings.botToken);
    }

}