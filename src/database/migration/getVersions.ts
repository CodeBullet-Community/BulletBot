import { getDatabaseMigrationVersion, getLatestMigrationVersion } from "./migrator";

async function printVersions() {
    console.log(`${await getDatabaseMigrationVersion()} ${getLatestMigrationVersion()}`);
}

printVersions();