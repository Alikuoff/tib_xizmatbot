# My Telegram Bot

This is a Telegram bot built using **Node.js** and the **Telegram Bot API**. The bot provides various functionalities, including user interaction through commands and automated responses.

## Features

- Uses **Node.js** and **Telegram Bot API** for efficient communication.
- Built with **Grammy.js** to handle bot interactions.
- Supports multiple commands and interactive buttons.
- Provides real-time responses and automation.
- Optimized for deployment using **Docker** and **Fly.io**.

## Technologies Used

The bot is developed using the following technologies:

- **Node.js** – Backend runtime environment.
- **Telegram Bot API** – Interface for bot and Telegram server communication.
- **Grammy.js** – Framework for creating robust Telegram bots.
- **Docker** – Containerization for easy deployment and scalability.
- **Fly.io** – Cloud hosting for seamless deployment.
- **GitHub Actions** – CI/CD automation for updates and deployments.

## Deployment Guide

To deploy the bot using **Fly.io**, follow these steps:

### Step 1: Install Fly CLI

Ensure you have Fly CLI installed on your machine. If not, install it using:

```sh
flyctl auth login
```

### Step 2: Initialize Fly.io App

If you haven't created a Fly.io app yet, initialize it with:

```sh
flyctl launch
```

Follow the prompts to set up your app.

### Step 3: Deploy the Bot

To deploy the bot from **Docker Hub**, run:

```sh
fly deploy --image justadzee/my-telegram-bot:latest
```

Ensure your bot listens on `0.0.0.0:3000` for proper connectivity.

### Step 4: Check Deployment Status

Monitor your bot's deployment at: [Fly.io Monitoring](https://fly.io/apps/desktop-cold-dawn-99/monitoring)

## Continuous Deployment

To ensure automatic updates from **Docker Hub**, follow these steps:

1. **Push new image** to Docker Hub:
   ```sh
   docker push justadzee/my-telegram-bot:latest
   ```
2. **Redeploy on Fly.io**
   ```sh
   fly deploy --image justadzee/my-telegram-bot:latest
   ```

## Authors

This bot was developed by:

- **Azizjon Aliqulov** ([GitHub](https://github.com/Alikuoff))
- **Abdusattorov Abduqodir** ([GitHub](https://github.com/Abduqodir0205))

## License

This project is licensed under the **MIT License** – feel free to modify and use it!

