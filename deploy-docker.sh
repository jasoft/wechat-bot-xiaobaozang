docker build --platform linux/amd64/v3 . -t wechat-bot
docker tag wechat-bot:latest sojdh/wechat-bot:latest
docker push sojdh/wechat-bot:latest