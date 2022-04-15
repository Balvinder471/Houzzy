"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const apollo_server_express_1 = require("apollo-server-express");
const database_1 = require("./database");
const graphql_1 = require("./graphql");
const config_1 = require("./config");
const { API_PREFIX, CLIENT_BUILD_DIR, REQUEST_BODY_LIMIT, SECRET } = config_1.Configuration;
exports.init = () => __awaiter(void 0, void 0, void 0, function* () {
    const app = express_1.default();
    app.use(body_parser_1.default.json({ limit: REQUEST_BODY_LIMIT }));
    app.use(cookie_parser_1.default(SECRET));
    app.use(compression_1.default());
    app.use(express_1.default.static(CLIENT_BUILD_DIR));
    app.get('/*', (_req, res) => res.sendFile(`${CLIENT_BUILD_DIR}/index.html`));
    const db = yield database_1.connectDatabase();
    const server = new apollo_server_express_1.ApolloServer({ resolvers: graphql_1.resolvers, typeDefs: graphql_1.typeDefs, context: ({ req, res }) => ({ db, req, res }) });
    server.applyMiddleware({ app, path: API_PREFIX });
    return app;
});
