# 1. Node.js 18 versiyasidan foydalanamiz
FROM node:18

# 2. Konteyner ichida /app papkasini yaratamiz
WORKDIR /app

# 3. package.json va package-lock.json fayllarni konteynerga nusxalash
COPY package*.json ./

# 4. NPM orqali kutubxonalarni o‘rnatish
RUN npm install

# 5. Loyihadagi barcha fayllarni konteynerga nusxalash
COPY . .

# 6. Container ichida live-reload ishlashi uchun
EXPOSE 3000

# 7. Nodemon yoki pm2 bilan botni ishga tushirish
CMD ["npm", "run", "dev"]
