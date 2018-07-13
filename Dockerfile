FROM node:8-alpine as builder

# Create app directory
RUN mkdir -p /usr/src/nanoRSS
WORKDIR /usr/src/nanoRSS

# Bundle app source
COPY . /usr/src/nanoRSS

# Install app dependencies
COPY package.json /usr/src/nanoRSS/
RUN  buildDeps='git' \
  && set -x \
  && apk add --no-cache --virtual .build-deps $buildDeps \
  && npm install \
  && apk del .build-deps

# Run tests
RUN npm test -- --timeout 10000

# Delete test resources
RUN rm -rf \
  test \
  .git .gitignore \
  Procfile package-lock.json

# Delete development files
RUN npm prune --production

# Copy into a fresh image
FROM node:8-alpine

WORKDIR /usr/src/nanoRSS
COPY --from=builder /usr/src/nanoRSS /usr/src/nanoRSS

EXPOSE 3000
CMD [ "npm", "start" ]
