const { MessageEmbed, WebhookClient } = require('discord.js');
const mysqldump = require('mysqldump');
const config = require('./config');
const chalk = require('chalk');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Add global error handler
process.on('unhandledRejection', (reason, promise) => {
    console.log(chalk.red('[UNHANDLED REJECTION]'), reason);
});

const MAX_DISCORD_SIZE = 8 * 1024 * 1024; // 8MB limit

// Function to compress SQL file
async function compressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const input = fs.createReadStream(inputPath);
        const output = fs.createWriteStream(outputPath);
        const gzip = zlib.createGzip({ level: 9 }); // Maximum compression
        
        input.pipe(gzip).pipe(output);
        output.on('finish', resolve);
        output.on('error', reject);
        input.on('error', reject);
    });
}

// Function to get file size in bytes
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        console.log(chalk.red('[FILE ERROR]'), 'Could not get file size:', error.message);
        return 0;
    }
}

// Function to format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

setInterval(async () => {
    try {
        console.log(chalk.yellow('[INFO]'), 'Starting database backup...');
        
        await mysqldump({
            connection: {
                host: config.connection.host,
                user: config.connection.user,
                password: config.connection.password,
                database: config.connection.database,
            },
            dumpToFile: './dump.sql'
        });

        console.log(chalk.green('[SUCCESS]'), 'Database dump completed');

        // Check original file size
        const originalSize = getFileSize('./dump.sql');
        const originalSizeMB = formatFileSize(originalSize);
        
        console.log(chalk.blue('[INFO]'), `Original dump size: ${originalSizeMB}`);

        let fileToUpload = './dump.sql';
        let finalSize = originalSize;
        let isCompressed = false;

        // If file is larger than Discord limit, try compression
        if (originalSize > MAX_DISCORD_SIZE) {
            console.log(chalk.yellow('[INFO]'), 'File too large, attempting compression...');
            
            try {
                await compressFile('./dump.sql', './dump.sql.gz');
                const compressedSize = getFileSize('./dump.sql.gz');
                const compressedSizeMB = formatFileSize(compressedSize);
                
                console.log(chalk.blue('[INFO]'), `Compressed size: ${compressedSizeMB}`);
                
                if (compressedSize <= MAX_DISCORD_SIZE) {
                    fileToUpload = './dump.sql.gz';
                    finalSize = compressedSize;
                    isCompressed = true;
                    console.log(chalk.green('[SUCCESS]'), 'File compressed successfully for upload');
                } else {
                    console.log(chalk.red('[ERROR]'), 'File still too large after compression');
                    // Clean up compressed file if it's still too large
                    if (fs.existsSync('./dump.sql.gz')) {
                        fs.unlinkSync('./dump.sql.gz');
                    }
                    return;
                }
            } catch (compressionError) {
                console.log(chalk.red('[COMPRESSION ERROR]'), compressionError.message);
                return;
            }
        }

        const webhookClient = new WebhookClient({
            id: config.webhook.split('https://discord.com/api/webhooks/')[1].split('/')[0],
            token: config.webhook.split('https://discord.com/api/webhooks/')[1].split('/')[1],
            restOptions: {
                timeout: 120000, // 2 minutes timeout for large files
            }
        });

        let time = Math.round(+new Date() / 1000);
        const embed = new MessageEmbed()
            .setTitle(`SQL BACKUP | ${config.connection.database}`)
            .setColor(config.embed.color)
            .setDescription(`Database backup saved on <t:${time}>\n**File Size:** ${formatFileSize(finalSize)}\n**Status:** ${isCompressed ? 'Compressed (.gz)' : 'Original'}`);

        // Wait a bit for file to be fully written
        setTimeout(async () => {
            try {
                console.log(chalk.yellow('[INFO]'), `Uploading ${formatFileSize(finalSize)} file to Discord...`);
                
                await webhookClient.send({
                    username: 'SQL Backup',
                    embeds: [embed],
                    files: [fileToUpload]
                });
                
                console.log(chalk.green('[SUCCESS]'), 'Backup sent to Discord');
                
                // Clean up files
                if (fs.existsSync('./dump.sql')) {
                    fs.unlinkSync('./dump.sql');
                }
                if (isCompressed && fs.existsSync('./dump.sql.gz')) {
                    fs.unlinkSync('./dump.sql.gz');
                }
                
            } catch (webhookError) {
                console.log(chalk.red('[WEBHOOK ERROR]'), webhookError.message);
                
                // Enhanced retry logic with file size check
                if (webhookError.code === 'AbortError' || 
                    webhookError.message.includes('timeout') || 
                    webhookError.message.includes('aborted')) {
                    
                    console.log(chalk.yellow('[RETRY]'), 'Attempting to resend webhook...');
                    
                    setTimeout(async () => {
                        try {
                            // Double-check file size before retry
                            const retryFileSize = getFileSize(fileToUpload);
                            if (retryFileSize > MAX_DISCORD_SIZE) {
                                console.log(chalk.red('[RETRY FAILED]'), 'File still too large for Discord');
                                return;
                            }
                            
                            await webhookClient.send({
                                username: 'SQL Backup',
                                embeds: [embed],
                                files: [fileToUpload]
                            });
                            
                            console.log(chalk.green('[RETRY SUCCESS]'), 'Backup sent on retry');
                            
                            // Clean up files after successful retry
                            if (fs.existsSync('./dump.sql')) {
                                fs.unlinkSync('./dump.sql');
                            }
                            if (isCompressed && fs.existsSync('./dump.sql.gz')) {
                                fs.unlinkSync('./dump.sql.gz');
                            }
                            
                        } catch (retryError) {
                            console.log(chalk.red('[RETRY FAILED]'), retryError.message);
                        }
                    }, 15000); // Wait 15 seconds before retry
                }
            }
        }, 5000); // Reduced wait time since we're checking file operations

    } catch (error) {
        console.log(chalk.red('[DATABASE ERROR]'), error.message);
    }
}, 1000 * 60 * config.time);

console.log(chalk.green`[ONLINE]` + chalk.white` I am now watching the database`);