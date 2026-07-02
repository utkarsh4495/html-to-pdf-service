FROM ghcr.io/puppeteer/puppeteer:22.15.0

# Switch to root temporarily to set up the working directory
USER root
WORKDIR /home/pptruser/app

# Copy package files and give pptruser ownership of the app directory
COPY package*.json ./
RUN chown -R pptruser:pptruser /home/pptruser/app

# Drop back to the non-root user for the install and runtime
USER pptruser
RUN npm install

# Copy the rest of the app (as pptruser)
COPY --chown=pptruser:pptruser . .

CMD ["node", "server.js"]
