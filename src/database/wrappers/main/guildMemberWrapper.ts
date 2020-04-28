import { Model } from 'mongoose';
import { keys } from 'ts-transformer-keys';

import { CommandResolvable, Commands } from '../../../commands';
import { BBGuildMember, GuildMemberDoc, GuildMemberObject } from '../../schemas/main/guildMember';
import { DocWrapper } from '../docWrapper';
import { GuildWrapper } from './guildWrapper';
import { UserWrapper } from './userWrapper';

export class GuildMemberWrapper extends DocWrapper<GuildMemberObject> implements BBGuildMember {
    readonly user: UserWrapper;
    readonly guild: GuildWrapper;
    readonly commandLastUsed: {
        readonly [x: string]: number;
    };
    private readonly commandModule: Commands;

    constructor(model: Model<GuildMemberDoc>, user: UserWrapper, guild: GuildWrapper, commandModule: Commands) {
        let initialData = { user: user.id, guild: guild.id };
        super(model, initialData, initialData, keys<GuildMemberObject>());

        this.user = user;
        this.guild = guild;
        this.commandModule = commandModule;
    }

    async getCommandLastUsed(command: CommandResolvable) {
        await this.load('commandLastUsed');
        let commandName = this.commandModule.resolveName(command);
        if (!this.commandLastUsed?.[commandName])
            return 0;
        return this.commandLastUsed[commandName];
    }

    async setCommandLastUsed(command: CommandResolvable, timestamp: number) {
        await this.load('commandLastUsed');
        let commandName = this.commandModule.resolveName(command);

        let query = { $set: {} };
        query.$set[`commandLastUsed.${commandName}`] = timestamp;
        await this.update(query);
        await this.user.setCommandLastUsed('global', command, timestamp);

        let tempData = await this.cloneData();
        tempData.commandLastUsed[commandName] = timestamp;
        this.data.next(tempData);
    }

    async canUseCommand(command: CommandResolvable) {
        // TODO: implement it with usageLimits
        throw new Error('Not yet implemented');
    }

}