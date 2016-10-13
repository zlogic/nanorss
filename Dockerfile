FROM node:slim

# Create app directory
RUN mkdir -p /usr/src/nanoRSS
WORKDIR /usr/src/nanoRSS

# Install app dependencies
COPY package.json /usr/src/nanoRSS/
RUN  buildDeps='git' \
  && set -x \
  && apt-get update && apt-get install -y $buildDeps --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && npm install \
  && apt-get purge -y --auto-remove $buildDeps

# Bundle app source
COPY . /usr/src/nanoRSS

# Run tests
RUN npm test

# Delete test resources
RUN rm -rf \
  test \
  .git .gitignore \
  Procfile

EXPOSE 3000
CMD [ "npm", "start" ]
