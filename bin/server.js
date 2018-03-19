#!/usr/bin/env babel-node

import express from 'express';
import pgp from 'pg-promise';
import {queryFederation} from '../src/federation';

const allowCORS = (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};

const db = pgp()(process.env.DB_URL);

const app = express();
app.use(allowCORS);
app.get('/api/federation', queryFederation(db));
app.listen(process.env.PORT);
