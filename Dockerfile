FROM node:10-alpine as builder

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

# Process resources with Webpack
RUN NODE_ENV=production npm run build:prod

# Run tests
RUN npm test -- --timeout 10000

# Delete development files
RUN npm prune --production

# Delete test resources, sources and other unnecessary files
RUN rm -rf \
  test src \
  .git .gitignore \
  Procfile package-lock.json

# Copy into a fresh image
FROM node:10-alpine

WORKDIR /usr/src/nanoRSS
COPY --from=builder /usr/src/nanoRSS /usr/src/nanoRSS

EXPOSE 3000
CMD [ "npm", "start" ]
