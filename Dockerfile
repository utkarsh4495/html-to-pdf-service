FROM ghcr.io/puppeteer/puppeteer:22.15.0

USER root
WORKDIR /home/pptruser/app

# Tell Puppeteer where the image's pre-installed Chrome cache lives
ENV PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer

COPY package*.json ./
RUN chown -R pptruser:pptruser /home/pptruser/app

USER pptruser
RUN npm install

COPY --chown=pptruser:pptruser . .

CMD ["node", "server.js"]
