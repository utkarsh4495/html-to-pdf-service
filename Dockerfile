FROM ghcr.io/puppeteer/puppeteer:22.15.0

WORKDIR /home/pptruser/app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "server.js"]
