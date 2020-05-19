import { Collection } from 'discord.js';
import mongoose, { Connection } from 'mongoose';

/**
 * Holds connections to MongoDB cluster
 *
 * @export
 * @class Database
 */
export class MongoCluster {

    /**
     * Cached connections for each collection
     *
     * @private
     * @type {Collection<string, Connection>}
     * @memberof MongoCluster
     */
    private connections: Collection<string, Connection>;

    /**
     * Creates an instance of Database.
     * 
     * @param {string} mongoURI Connection URI to MongoDB cluster
     * @memberof Database
     */
    constructor(private mongoURI: string) {
        mongoose.set('useNewUrlParser', true);
        mongoose.set('useUnifiedTopology', true);
    }

    /**
     * Gets cached connection or creates a new connection to a specific database
     *
     * @param {string} databaseName Name of the database
     * @returns Connection to the database (might not be open yet)
     * @memberof Database
     */
    getConnection(databaseName: string) {
        let connection = this.connections.get(databaseName);
        if (connection) return connection;
        connection = mongoose.createConnection(this.mongoURI, {
            dbName: databaseName
        });
        this.connections.set(databaseName, connection);
        return connection;
    }
}