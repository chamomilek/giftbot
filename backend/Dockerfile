FROM node:20 AS build

WORKDIR /build

RUN npm install -g npm@9.8.1

COPY package.json .
RUN npm install

COPY . .

COPY ./wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

RUN npm run build
RUN npm prune --force

FROM node:20
WORKDIR /app

COPY --from=build /build/ /app
COPY --from=build /build/node_modules/ /app/node_modules
COPY --from=build /wait-for-it.sh /wait-for-it.sh


RUN npm rebuild
RUN chmod +x /wait-for-it.sh
CMD ["/wait-for-it.sh", "mysql:3306", "--", "npm", "run", "start"]