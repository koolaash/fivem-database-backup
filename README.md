Based on your FiveM database backup project and the search results, here's a comprehensive README for your GitHub repository:

# 🛡️ FiveM Database Backup

An automated MySQL database backup system for FiveM servers with Discord webhook integration. This tool creates scheduled backups of your server database and sends them to Discord for easy management and monitoring.

## ✨ Features

- 🕒 **Automated Scheduled Backups** - Configurable backup intervals
- 📦 **Smart File Compression** - Automatic gzip compression for large databases  
- 🔗 **Discord Integration** - Sends backups directly to Discord via webhooks
- 📊 **File Size Management** - Handles Discord's 8MB upload limit intelligently
- 🛠️ **Error Handling** - Robust error handling with retry mechanisms
- 📱 **Real-time Notifications** - Colored console output and Discord status updates
- 🧹 **Automatic Cleanup** - Removes temporary files after successful uploads

## 🚀 Quick Start

### Prerequisites

- Node.js v16.9.0 or higher
- MySQL/MariaDB server
- Discord webhook URL
- FiveM server with database access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/koolaash/fivem-database-backup.git
   cd fivem-database-backup
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the application**
   ```bash
   cp config.example.js config.js
   ```

4. **Edit configuration file**
   ```javascript
   // config.js
   module.exports = {
       connection: {
           host: 'localhost',
           user: 'your_username',
           password: 'your_password',
           database: 'your_database_name'
       },
       webhook: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_URL',
       time: 30, // Backup interval in minutes
       embed: {
           color: 0x00ff00 // Discord embed color
       }
   };
   ```

5. **Start the backup service**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Database Settings
```javascript
connection: {
    host: 'localhost',          // MySQL server host
    user: 'backup_user',        // Database username
    password: 'secure_password', // Database password
    database: 'fivem_essential' // Database name
}
```

### Discord Webhook
1. Create a webhook in your Discord server
2. Copy the webhook URL
3. Add it to your config file

### Backup Schedule
```javascript
time: 30 // Minutes between backups (default: 30)
```

## 📁 Project Structure

```
fivem-database-backup/
├── index.js              # Main application
├── config.js             # Configuration file
├── package.json          # Dependencies
├── README.md             # This file
└── .gitignore            # Git ignore rules
```

## 🔧 Advanced Features

### File Size Management
- Automatically compresses SQL dumps using gzip
- Checks file size before Discord upload
- Handles files larger than Discord's 8MB limit
- Provides detailed file size information

### Error Recovery
- Automatic retry on upload failures
- Comprehensive error logging
- Graceful handling of network timeouts
- Database connection error recovery

### Monitoring
- Real-time console logging with colors
- Discord embed notifications
- Backup status tracking
- File size reporting

## 📋 Dependencies

```json
{
  "discord.js": "^14.14.1",
  "mysqldump": "^3.2.0", 
  "chalk": "^4.1.2"
}
```

## 🛠️ Development

### Running in Development Mode
```bash
npm install --save-dev nodemon
npm run dev
```

### Testing Configuration
```bash
# Test database connection
node -e "require('./config.js')"

# Manual backup trigger  
node index.js
```

## 📱 Discord Integration

### Webhook Setup
1. Go to your Discord server settings
2. Navigate to **Integrations** → **Webhooks**
3. Click **Create Webhook**
4. Copy the webhook URL
5. Add to your `config.js` file

### Sample Discord Output
```
🛡️ SQL BACKUP | fivem_essential
Database backup saved on <timestamp>
File Size: 2.45 MB
Status: Compressed (.gz)
```

## ⚠️ Important Notes

### Security
- Keep your `config.js` file secure and never commit database credentials
- Use environment variables for production deployments
- Ensure your MySQL user has only necessary permissions

### Performance
- Large databases may take time to backup
- Consider backup frequency based on server activity
- Monitor disk space for temporary backup files

### FiveM Compatibility
- Works with all FiveM frameworks (ESX, QBCore, etc.)
- Compatible with popular resources (essential, banking, etc.)
- Supports custom database schemas

## 🔄 Backup Process Flow

1. **Database Dump** - Creates SQL dump using mysqldump
2. **File Check** - Verifies backup file integrity  
3. **Compression** - Applies gzip compression if needed
4. **Size Validation** - Checks Discord upload limits
5. **Discord Upload** - Sends backup via webhook
6. **Cleanup** - Removes temporary files
7. **Notification** - Logs success/failure status

## 🚨 Troubleshooting

### Common Issues

**AbortError: The user aborted a request**
- File too large for Discord (>8MB)
- Solution: Automatic compression is enabled

**Database Connection Failed**
- Check MySQL server status
- Verify credentials in config.js
- Ensure database exists

**Webhook Error**
- Verify Discord webhook URL
- Check webhook permissions
- Test webhook independently

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/koolaash/fivem-database-backup/issues)
- 💬 **Discord**: Join our community server
- 📧 **Email**: Contact for business inquiries

## 🌟 Acknowledgments

- [FiveM Community](https://forum.cfx.re/) for server management insights[1][2]
- [Discord.js](https://discord.js.org/) for API wrapper[3][4]
- MySQL community for database tools[5][6]

***

⭐ **Star this repository if it helped your FiveM server!**

Built with ❤️ for the FiveM community

[1](https://forum.cfx.re/t/flight-database-backup/5184225)
[2](https://github.com/elajnabe/flight-backup)
[3](https://github.com/NAT2K15/database-backup)
[4](https://github.com/tobihdff/discord-mysql-backup-bot)
[5](https://help.sparkedhost.com/en/article/how-to-make-a-database-for-fivem-server-wia45e/)
[6](https://docs.1of1servers.com/1-of-1-game-server-guides/fivem/sql-backup)
[7](http://codesandbox.io/p/github/MubinFR/fivem-database-backup)
[8](https://docs.rainmad.com/development-guide/how-to-add-webhooks)
[9](https://phongsakonwk.itch.io/discord-backup-gdrive)
[10](https://www.youtube.com/watch?v=oV1JG4UCbek)
[11](https://docs.sonoransoftware.com/cad/integration-plugins/discord-webhooks)
[12](https://railway.com/deploy/mT6Hiw)
[13](https://forum.cfx.re/t/database-management/5340518)
[14](https://stackoverflow.com/questions/8446193/automatically-backup-mysql-database-on-linux-server)
[15](https://txadmin.gg)
[16](https://www.reddit.com/r/Discord_Bots/comments/10i6z2y/using_a_mysql_database_to_serve_multiple_guilds/)
[17](https://shockbyte.com/tr/help/knowledgebase/articles/how-to-setup-a-database-for-your-fivem-server)
[18](https://forum.cfx.re/t/standalone-sql-backup-manager/3716590)
[19](https://github.com/TNovalis/FiveM-ServerManager)
[20](https://www.youtube.com/watch?v=YDR9XnEHu8Q)