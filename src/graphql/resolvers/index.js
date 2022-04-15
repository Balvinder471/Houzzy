"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const booking_1 = require("./booking");
const listing_1 = require("./listing");
const user_1 = require("./user");
const viewer_1 = require("./viewer");
exports.resolvers = lodash_1.merge(booking_1.bookingResolvers, listing_1.listingResolvers, user_1.userResolvers, viewer_1.viewerResolvers);
