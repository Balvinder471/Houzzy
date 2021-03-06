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
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("../config");
const { STRIPE_CLIENT_ID, STRIPE_SECRET_KEY } = config_1.Configuration;
const client = new stripe_1.default(STRIPE_SECRET_KEY, { apiVersion: '2020-03-02' });
exports.Stripe = {
    charge: (amount, source, stripeAccount) => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield client.charges.create({
            amount,
            currency: 'inr',
            source,
            /* eslint-disable-next-line @typescript-eslint/camelcase */
            application_fee_amount: Math.round(amount * 0.05),
        }, {
            stripeAccount,
        });
        if (result.status !== 'succeeded') {
            throw new Error('Failed to create charge with Stripe');
        }
    }),
    connect: (code) => __awaiter(void 0, void 0, void 0, function* () {
        return yield client.oauth.token({
            code,
            /* eslint-disable-next-line @typescript-eslint/camelcase */
            grant_type: 'authorization_code',
        });
    }),
    disconnect: (stripeUserId) => __awaiter(void 0, void 0, void 0, function* () {
        return yield client.oauth.deauthorize({
            /* eslint-disable @typescript-eslint/camelcase */
            client_id: STRIPE_CLIENT_ID,
            stripe_user_id: stripeUserId,
        });
    }),
};
