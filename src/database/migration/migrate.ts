import { getLatestMigrationVersion, getDatabaseMigrationVersion } from "./migrator";
import { exit } from "process";

async function main() {
    let targetVersion = Number(process.argv[2]);
    if (!Number.isInteger(targetVersion))
        targetVersion = getLatestMigrationVersion();
    let currentVersion = await getDatabaseMigrationVersion();

    // Just for testing
    if (targetVersion == 0)
        throw new Error(`Cannot migrate database from ${currentVersion} to ${targetVersion}`);
    console.log(`Successfully migrated database from ${currentVersion} to ${targetVersion}`);
}

main().catch(err => {
    console.error(err.message);
    exit(1);
});
