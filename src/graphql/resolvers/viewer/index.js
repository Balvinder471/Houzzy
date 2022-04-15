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
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../../../config");
const api_1 = require("../../../api");
const utils_1 = require("../../../utils");
const { ENVIRONMENT } = config_1.Configuration;
const cookieOptions = {
    httpOnly: true,
    sameSite: true,
    signed: true,
    secure: ENVIRONMENT === 'development' ? false : true,
};
const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;
const logInViaGoogle = (code, token, db, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const { user } = yield api_1.Google.logIn(code);
    if (!user) {
        throw new Error('Google login error');
    }
    const userNamesList = ((_a = user.names) === null || _a === void 0 ? void 0 : _a.length) ? user.names : null;
    const userPhotosList = ((_b = user.photos) === null || _b === void 0 ? void 0 : _b.length) ? user.photos : null;
    const userEmailsList = ((_c = user.emailAddresses) === null || _c === void 0 ? void 0 : _c.length) ? user.emailAddresses : null;
    const userName = (userNamesList && userNamesList[0].displayName) || null;
    const userId = (userNamesList && ((_e = (_d = userNamesList[0].metadata) === null || _d === void 0 ? void 0 : _d.source) === null || _e === void 0 ? void 0 : _e.id)) || null;
    const userAvatar = (userPhotosList && userPhotosList[0].url) || null;
    const userEmail = (userEmailsList && userEmailsList[0].value) || null;
    if (!userId || !userName || !userAvatar || !userEmail) {
        throw new Error('Google login error');
    }
    const updateResult = yield db.users.findOneAndUpdate({ _id: userId }, { $set: { name: userName, avatar: userAvatar, contact: userEmail, token } }, { returnOriginal: false });
    let viewer = updateResult.value;
    if (!viewer) {
        const insertResult = yield db.users.insertOne({
            _id: userId,
            token,
            name: userName,
            avatar: userAvatar,
            contact: userEmail,
            income: 0,
            bookings: [],
            listings: [],
            walletId: null,
        });
        viewer = insertResult.ops[0];
    }
    res.cookie('viewer', userId, Object.assign(Object.assign({}, cookieOptions), { maxAge: ONE_YEAR_IN_MS }));
    return viewer;
});
const logInViaCookie = (token, db, req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updateResult = yield db.users.findOneAndUpdate({ _id: req.signedCookies.viewer }, { $set: { token } }, { returnOriginal: false });
    const viewer = updateResult.value;
    if (!viewer) {
        res.clearCookie('viewer', cookieOptions);
    }
    return viewer;
});
exports.viewerResolvers = {
    Query: {
        authUrl: () => {
            try {
                return api_1.Google.authUrl;
            }
            catch (err) {
                throw new Error(`Failed to query Google Auth Url: ${err}`);
            }
        },
    },
    Mutation: {
        logIn: (_root, { input }, { db, req, res }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const code = input ? input.code : null;
                const token = crypto_1.default.randomBytes(16).toString('hex');
                const viewer = code ? yield logInViaGoogle(code, token, db, res) : yield logInViaCookie(token, db, req, res);
                return Object.assign({ didRequest: true }, (viewer && {
                    _id: viewer._id,
                    token: viewer.token,
                    avatar: viewer.avatar,
                    walletId: viewer.walletId,
                }));
            }
            catch (err) {
                throw new Error(`Failed to log in: ${err}`);
            }
        }),
        logOut: (_root, _args, { res }) => {
            try {
                res.clearCookie('viewer', cookieOptions);
                return { didRequest: true };
            }
            catch (err) {
                throw new Error(`Failed to log out: ${err}`);
            }
        },
        connectStripe: (_root, { input }, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const { code } = input;
                let viewer = yield utils_1.authorize(db, req);
                if (!viewer) {
                    throw new Error('Viewer cannot be found');
                }
                const wallet = yield api_1.Stripe.connect(code);
                if (!wallet) {
                    throw new Error('Stripe grant error');
                }
                const updateResponse = yield db.users.findOneAndUpdate({ _id: viewer._id }, { $set: { walletId: wallet.stripe_user_id } }, { returnOriginal: false });
                if (!updateResponse.value) {
                    throw new Error('Viewer could not be updated');
                }
                viewer = updateResponse.value;
                return {
                    _id: viewer._id,
                    avatar: viewer.avatar,
                    didRequest: true,
                    token: viewer.token,
                    walletId: viewer.walletId,
                };
            }
            catch (err) {
                throw new Error(`Failed to connect with Stripe: ${err}`);
            }
        }),
        disconnectStripe: (_root, _args, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                let viewer = yield utils_1.authorize(db, req);
                if (!viewer || !viewer.walletId) {
                    throw new Error('Viewer cannot be found or has not connected with Stripe');
                }
                const wallet = yield api_1.Stripe.disconnect(viewer.walletId);
                if (!wallet) {
                    throw new Error('Stripe disconnect error');
                }
                const updateResponse = yield db.users.findOneAndUpdate({ _id: viewer._id }, { $set: { walletId: null } }, { returnOriginal: false });
                if (!updateResponse.value) {
                    throw new Error('Viewer could not be updated');
                }
                viewer = updateResponse.value;
                return {
                    _id: viewer._id,
                    avatar: viewer.avatar,
                    didRequest: true,
                    token: viewer.token,
                    walletId: viewer.walletId,
                };
            }
            catch (err) {
                throw new Error(`Failed to disconnect with Stripe: ${err}`);
            }
        }),
    },
    Viewer: {
        id: (viewer) => viewer._id,
        hasWallet: (viewer) => (viewer.walletId ? true : undefined),
    },
};
