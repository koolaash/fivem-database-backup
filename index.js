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

// Function to force delete files (even locked ones)
function forceDeleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            // Try to change file permissions first
            try {
                fs.chmodSync(filePath, 0o666);
            } catch (permError) {
                console.log(chalk.yellow('[PERMISSION WARNING]'), `Could not change permissions for ${filePath}`);
            }

            // Try synchronous deletion first
            try {
                fs.unlinkSync(filePath);
                console.log(chalk.blue('[CLEANUP]'), `Force deleted: ${filePath}`);
                return true;
            } catch (syncError) {
                console.log(chalk.yellow('[SYNC DELETE FAILED]'), `${filePath}: ${syncError.message}`);

                // Try asynchronous deletion as fallback
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.log(chalk.red('[ASYNC DELETE FAILED]'), `${filePath}: ${err.message}`);
                    } else {
                        console.log(chalk.blue('[CLEANUP]'), `Async deleted: ${filePath}`);
                    }
                });
                return false;
            }
        } else {
            console.log(chalk.gray('[INFO]'), `File does not exist: ${filePath}`);
            return true;
        }
    } catch (error) {
        console.log(chalk.red('[FORCE DELETE ERROR]'), `${filePath}: ${error.message}`);
        return false;
    }
}

// Function to clean up all backup files before starting
function cleanupPreviousFiles() {
    console.log(chalk.yellow('[CLEANUP]'), 'Cleaning up previous backup files...');

    const filesToClean = ['./save.sql', './save.sql.gz'];
    let allCleaned = true;

    filesToClean.forEach(file => {
        if (!forceDeleteFile(file)) {
            allCleaned = false;
        }
    });

    if (allCleaned) {
        console.log(chalk.green('[CLEANUP SUCCESS]'), 'All previous files cleaned up successfully');
    } else {
        console.log(chalk.yellow('[CLEANUP WARNING]'), 'Some files could not be cleaned up immediately');
    }

    return allCleaned;
}

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

// Function to safely delete files with database disconnect
function safeDeleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            // Force garbage collection to release any file handles
            if (global.gc) {
                global.gc();
            }

            // Add small delay to ensure file handles are released
            setTimeout(() => {
                try {
                    fs.unlinkSync(filePath);
                    console.log(chalk.blue('[CLEANUP]'), `Successfully deleted: ${filePath}`);
                } catch (deleteError) {
                    console.log(chalk.red('[DELETE ERROR]'), `Failed to delete ${filePath}:`, deleteError.message);
                }
            }, 1000);
        }
    } catch (error) {
        console.log(chalk.red('[FILE ERROR]'), `Error checking file ${filePath}:`, error.message);
    }
}

setInterval(async () => {
    let dumpResult = null;

    try {
        // STEP 1: Clean up any previous backup files before starting
        console.log(chalk.cyan('[PRE-CLEANUP]'), 'Starting pre-backup cleanup...');
        cleanupPreviousFiles();

        // Wait a moment for file system operations to complete
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log(chalk.yellow('[INFO]'), 'Starting database backup...');

        // STEP 2: Perform database dump
        dumpResult = await mysqldump({
            connection: {
                host: config.connection.host,
                user: config.connection.user,
                password: config.connection.password,
                database: config.connection.database,
            },
            dumpToFile: './save.sql'
        });

        console.log(chalk.green('[SUCCESS]'), 'Database dump completed');

        // STEP 3: Explicitly close any database connections
        if (dumpResult && dumpResult.connection) {
            try {
                await dumpResult.connection.end();
                console.log(chalk.blue('[INFO]'), 'Database connection closed');
            } catch (closeError) {
                console.log(chalk.yellow('[WARNING]'), 'Error closing connection:', closeError.message);
            }
        }

        // Add delay to ensure database connection is fully released
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check original file size
        const originalSize = getFileSize('./save.sql');
        const originalSizeMB = formatFileSize(originalSize);

        console.log(chalk.blue('[INFO]'), `Original dump size: ${originalSizeMB}`);

        let fileToUpload = './save.sql';
        let finalSize = originalSize;
        let isCompressed = false;

        // If file is larger than Discord limit, try compression
        if (originalSize > MAX_DISCORD_SIZE) {
            console.log(chalk.yellow('[INFO]'), 'File too large, attempting compression...');

            try {
                await compressFile('./save.sql', './save.sql.gz');
                const compressedSize = getFileSize('./save.sql.gz');
                const compressedSizeMB = formatFileSize(compressedSize);

                console.log(chalk.blue('[INFO]'), `Compressed size: ${compressedSizeMB}`);

                if (compressedSize <= MAX_DISCORD_SIZE) {
                    fileToUpload = './save.sql.gz';
                    finalSize = compressedSize;
                    isCompressed = true;
                    console.log(chalk.green('[SUCCESS]'), 'File compressed successfully for upload');
                } else {
                    console.log(chalk.red('[ERROR]'), 'File still too large after compression');
                    safeDeleteFile('./save.sql.gz');
                    safeDeleteFile('./save.sql');
                    return;
                }
            } catch (compressionError) {
                console.log(chalk.red('[COMPRESSION ERROR]'), compressionError.message);
                safeDeleteFile('./save.sql');
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

        // Wait a bit for file to be fully written and connections released
        setTimeout(async () => {
            try {
                console.log(chalk.yellow('[INFO]'), `Uploading ${formatFileSize(finalSize)} file to Discord...`);

                await webhookClient.send({
                    username: 'SQL Backup',
                    embeds: [embed],
                    files: [fileToUpload]
                });

                console.log(chalk.green('[SUCCESS]'), 'Backup sent to Discord');

                setTimeout(async () => {
                    try {
                        // Clean up files with safe deletion
                        safeDeleteFile('./save.sql');
                        if (isCompressed) {
                            safeDeleteFile('./save.sql.gz');
                        }
                    } catch (err) {
                        console.log(chalk.red('[CLEANUP ERROR]'), err.message);
                    }
                }, 15000); // Wait 15 seconds before retry

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
                                safeDeleteFile('./save.sql');
                                if (isCompressed) {
                                    safeDeleteFile('./save.sql.gz');
                                }
                                return;
                            }

                            await webhookClient.send({
                                username: 'SQL Backup',
                                embeds: [embed],
                                files: [fileToUpload]
                            });

                            console.log(chalk.green('[RETRY SUCCESS]'), 'Backup sent on retry');

                            // Clean up files after successful retry
                            safeDeleteFile('./save.sql');
                            if (isCompressed) {
                                safeDeleteFile('./save.sql.gz');
                            }

                        } catch (retryError) {
                            console.log(chalk.red('[RETRY FAILED]'), retryError.message);
                            // Clean up files even on retry failure
                            safeDeleteFile('./save.sql');
                            if (isCompressed) {
                                safeDeleteFile('./save.sql.gz');
                            }
                        }
                    }, 15000); // Wait 15 seconds before retry
                } else {
                    // Clean up files for non-retry errors
                    safeDeleteFile('./save.sql');
                    if (isCompressed) {
                        safeDeleteFile('./save.sql.gz');
                    }
                }
            }
        }, 7000); // Increased wait time to ensure database is fully disconnected

    } catch (error) {
        console.log(chalk.red('[DATABASE ERROR]'), error.message);

        // Ensure connection is closed even on error
        if (dumpResult && dumpResult.connection) {
            try {
                await dumpResult.connection.end();
            } catch (closeError) {
                console.log(chalk.yellow('[WARNING]'), 'Error closing connection on error:', closeError.message);
            }
        }

        // Clean up any created files
        safeDeleteFile('./save.sql');
        safeDeleteFile('./save.sql.gz');
    }
}, 1000 * 60 * config.time);

console.log(chalk.green`[ONLINE]` + chalk.white` I am now watching the database`);
