const config = {
    // Discord webhook URL for sending backup notifications
    webhook: "", // Replace with your Discord webhook URL
    
    // Backup interval configuration
    time: 30, // Backup interval in minutes
              // WARNING: Do not set below 1 minute to prevent:
              // - File handle conflicts
              // - Backup overwrites  
              // - Non-deletable/locked file creation
              // - Resource exhaustion
    
    // Database connection configuration
    connection: {
        host: "localhost",     // MySQL server hostname/IP
        user: "root",         // MySQL username
        password: "",         // MySQL password (leave empty for no password)
        database: "",         // Target database name for backup. NOTE : Make sure the database name is in lowercases
    },

    // Discord embed styling configuration
    embed: {
        color: "GREEN",       // Embed color (GREEN, RED, BLUE, ORANGE, etc.)
    },
}

module.exports = config