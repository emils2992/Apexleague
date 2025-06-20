# Discord Football Registration Bot

## Overview

This is a Discord bot designed specifically for football (soccer) themed servers with a comprehensive registration system. The bot manages user registration, role assignment, nickname management, and provides various administrative tools for server management. It features a Turkish language interface and is optimized to run on hosting platforms like Glitch and Replit.

## System Architecture

### Bot Framework
- **Discord.js v13.17.1**: Core Discord API wrapper
- **Node.js 20**: Runtime environment
- **Express.js**: Web server for health checks and uptime monitoring
- **File-based JSON Database**: Simple data persistence without external dependencies

### Application Structure
```
├── index.js                 # Main bot entry point and web server
├── commands/               # Slash commands and text commands
├── events/                 # Discord event handlers
├── utils/                  # Database utilities and helpers
└── data/                   # JSON database files
```

## Key Components

### 1. Registration System
- **User Registration**: Assigns roles and nicknames to new members
- **Role Management**: Supports multiple football-themed roles (Player, Coach, President, Partner, etc.)
- **Name Management**: Automatic nickname assignment and manual name changes
- **Unregistration**: Reset user roles back to unregistered status

### 2. Event Handlers
- **guildMemberAdd**: Automatically assigns "Kayıtsız" (Unregistered) role to new human members
- **messageCreate**: Processes text commands with prefix-based parsing
- **interactionCreate**: Handles button interactions for role assignments
- **ready**: Bot initialization and activity status

### 3. Database System
- **Settings Storage**: Guild-specific configuration (roles, channels, permissions)
- **Registration Logs**: Complete history of all user registrations
- **Staff Statistics**: Tracking registration counts per staff member

### 4. Command Categories
- **Admin Commands**: System setup and configuration
- **Staff Commands**: Registration management and user queries
- **Voice Commands**: Voice channel management
- **Utility Commands**: Help, statistics, and debugging

## Data Flow

### Registration Process
1. Staff member uses `.k @user name` command
2. System validates permissions and target user
3. Removes "Kayıtsız" role from user
4. Presents role selection buttons (Player, Coach, etc.)
5. Staff selects appropriate role via button interaction
6. System assigns role, updates nickname, logs action
7. Sends confirmation to registration channel

### New Member Flow
1. User joins Discord server
2. Bot checks if user is human (not bot)
3. Assigns "Kayıtsız" role automatically
4. Sets nickname to "Kayıtsız" if enabled
5. Logs join event to appropriate channels
6. Waits for staff to manually register user

## External Dependencies

### Core Libraries
- **discord.js**: Discord API integration
- **@discordjs/voice**: Voice channel functionality
- **express**: Web server for uptime monitoring
- **dotenv**: Environment variable management

### Audio Libraries (Optional)
- **ffmpeg-static**: Audio processing
- **libsodium-wrappers**: Encryption for voice
- **opusscript**: Audio codec support

### Database
- **File-based JSON**: No external database required
- **Local storage**: `data/settings.json` and `data/registrations.json`

## Deployment Strategy

### Platform Compatibility
- **Replit**: Primary target platform with web server integration
- **Glitch**: Alternative hosting with health check endpoint
- **Local Development**: Full development environment support

### Configuration
- **Environment Variables**: Bot token, port, and project domain
- **Auto-restart**: Express server keeps process alive
- **Health Monitoring**: Status endpoint for uptime services

### File Structure
- **Persistent Data**: JSON files in `/data` directory
- **Module Loading**: Dynamic command and event loading
- **Error Handling**: Comprehensive logging and graceful degradation

## Changelog

- June 20, 2025. Initial setup
- June 20, 2025. Added `.kayitsayi` command for individual user registration statistics with role breakdown
- June 20, 2025. Enhanced `.top` command with detailed role statistics and pagination functionality
- June 20, 2025. Integrated custom Discord emojis throughout all registration messages, commands, and role displays
- June 20, 2025. Updated join notification format to use quote-style messages with custom emojis and Discord timestamps
- June 20, 2025. Updated all emoji references to use animated versions for enhanced visual effects
- June 20, 2025. Fixed role mapping in .kayitsayi and .top commands to use correct database field names

## User Preferences

Preferred communication style: Simple, everyday language.