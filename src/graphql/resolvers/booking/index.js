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
const mongodb_1 = require("mongodb");
const utils_1 = require("../../../utils");
const stripe_1 = require("../../../api/stripe");
const MILLISECONDS_PER_DAY = 60 * 60 * 24 * 1000;
const MAX_DAYS_AHEAD = 90;
const resolveBookingsIndex = (bookingsIndex, checkInDate, checkOutDate) => {
    const checkOut = new Date(checkOutDate);
    const newBookingsIndex = Object.assign({}, bookingsIndex);
    let dateCursor = new Date(checkInDate);
    while (dateCursor <= checkOut) {
        const year = dateCursor.getUTCFullYear();
        const month = dateCursor.getUTCMonth();
        const day = dateCursor.getUTCDate();
        if (!newBookingsIndex[year]) {
            newBookingsIndex[year] = {};
        }
        if (!newBookingsIndex[year][month]) {
            newBookingsIndex[year][month] = {};
        }
        if (!newBookingsIndex[year][month][day]) {
            newBookingsIndex[year][month][day] = true;
        }
        else {
            throw new Error("Selected dates can't overlap dates that have already been booked");
        }
        dateCursor = new Date(dateCursor.getTime() + MILLISECONDS_PER_DAY);
    }
    return newBookingsIndex;
};
exports.bookingResolvers = {
    Query: {
        bookings: (_root, _args, { db }) => __awaiter(void 0, void 0, void 0, function* () {
            return yield db.bookings.find({}).toArray();
        }),
    },
    Mutation: {
        createBooking: (_root, { input }, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const { checkIn, checkOut, id, source } = input;
                const viewer = yield utils_1.authorize(db, req);
                if (!viewer) {
                    throw new Error('Viewer cannot be found');
                }
                const listing = yield db.listings.findOne({ _id: new mongodb_1.ObjectId(id) });
                if (!listing) {
                    throw new Error(`Listing with id "${id}" cannot be found`);
                }
                if (listing.host === viewer._id) {
                    throw new Error("Viewer can't book own listing");
                }
                const now = Date.now();
                const checkInDate = new Date(checkIn);
                const checkOutDate = new Date(checkOut);
                if (checkInDate.getTime() > now + MAX_DAYS_AHEAD * MILLISECONDS_PER_DAY) {
                    throw new Error(`Check in date can't be more than ${MAX_DAYS_AHEAD} days from today`);
                }
                if (checkOutDate.getTime() > now + MAX_DAYS_AHEAD * MILLISECONDS_PER_DAY) {
                    throw new Error(`Check out date can't be more than ${MAX_DAYS_AHEAD} days from today`);
                }
                if (checkOutDate < checkInDate) {
                    throw new Error("Check out date can't be before check in date");
                }
                const bookingsIndex = resolveBookingsIndex(listing.bookingsIndex, checkIn, checkOut);
                const totalPrice = listing.price * ((checkOutDate.getTime() - checkInDate.getTime()) / MILLISECONDS_PER_DAY + 1);
                const host = yield db.users.findOne({ _id: listing.host });
                if (!host || !host.walletId) {
                    throw new Error("The host either can't be found or is not connected with Stripe");
                }
                yield stripe_1.Stripe.charge(totalPrice, source, host.walletId);
                const insertResult = yield db.bookings.insertOne({
                    _id: new mongodb_1.ObjectId(),
                    listing: listing._id,
                    tenant: viewer._id,
                    checkIn,
                    checkOut,
                });
                const [insertedBooking] = insertResult.ops;
                yield db.users.updateOne({ _id: host._id }, { $inc: { income: totalPrice } });
                yield db.users.updateOne({ _id: viewer._id }, { $push: { bookings: insertedBooking._id } });
                yield db.listings.updateOne({ _id: listing._id }, { $set: { bookingsIndex }, $push: { bookings: insertedBooking._id } });
                return insertedBooking;
            }
            catch (err) {
                throw new Error(`Failed to create a booking: ${err}`);
            }
        }),
    },
    Booking: {
        id: (booking) => booking._id.toString(),
        listing: (booking, _args, { db }) => {
            return db.listings.findOne({ _id: booking.listing });
        },
        tenant: (booking, _args, { db }) => {
            return db.users.findOne({ _id: booking.tenant });
        },
    },
};
