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
Object.defineProperty(exports, "__esModule", { value: true });
const googleapis_1 = require("googleapis");
const maps_1 = require("@google/maps");
const config_1 = require("../config");
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_GEOCODE_KEY, PUBLIC_URL } = config_1.Configuration;
const auth = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${PUBLIC_URL}/login`);
const maps = maps_1.createClient({ key: GOOGLE_GEOCODE_KEY, Promise });
const parseAddress = (addressComponents) => {
    return addressComponents.reduce((acc, component) => {
        if (component.types.includes('country')) {
            acc.country = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
            acc.admin = component.long_name;
        }
        if (component.types.includes('locality') || component.types.includes('postal_town')) {
            acc.city = component.long_name;
        }
        return acc;
    }, {
        admin: null,
        city: null,
        country: null,
    });
};
exports.Google = {
    authUrl: auth.generateAuthUrl({
        // eslint-disable-next-line @typescript-eslint/camelcase
        access_type: 'online',
        scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    }),
    logIn: (code) => __awaiter(void 0, void 0, void 0, function* () {
        const { tokens } = yield auth.getToken(code);
        auth.setCredentials(tokens);
        const { data } = yield googleapis_1.google.people({ version: 'v1', auth }).people.get({
            resourceName: 'people/me',
            personFields: 'emailAddresses,names,photos',
        });
        return { user: data };
    }),
    geocode: (address) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const response = yield maps.geocode({ address }).asPromise();
            if (response.status < 200 || response.status > 299) {
                throw new Error('Failed to geocode address');
            }
            return parseAddress(response.json.results[0].address_components);
        }
        catch (err) {
            const msg = ((_a = err.json) === null || _a === void 0 ? void 0 : _a.error_message) || err.message;
            throw new Error(`An error occurred during geocoding: ${msg}`);
        }
    }),
};
