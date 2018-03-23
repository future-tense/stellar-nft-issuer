
import StellarSdk from 'stellar-sdk';
import ipfsAPI from 'ipfs-api';
import Unixfs from 'ipfs-unixfs';
import {DAGNode} from 'ipfs-merkle-dag';
import pgp from 'pg-promise';
import multihash from 'multihashes';
import stringifySafe from 'json-stringify-safe';

import {setFederation} from './federation';
import sign from './sign';

const transaction = (account, homeDomain, token, owner) => {
    return new StellarSdk.TransactionBuilder(account)
    .addOperation(StellarSdk.Operation.createAccount({
        destination:     token,
        startingBalance: '2'
    }))
    .addOperation(StellarSdk.Operation.setOptions({
        source:       token,
        homeDomain:   homeDomain,
        masterWeight: 0,
        signer: {
            ed25519PublicKey: owner,
            weight:           1
        }
    }))
    .build();
};

const createSignedObject = (issuerKeys, data) => {

    const json = stringifySafe(data);
    const hash = StellarSdk.hash(json);
    const signature = issuerKeys.sign(hash).toString('base64');

    return stringifySafe({
        sig: signature,
        meta: data
    });
};

const getCID = (blob) => {
    const test = new Unixfs('file', new Buffer(blob));
    const {Hash} = new DAGNode(test.marshal(), []).toJSON();
    return Hash;
};

const getKeypair = cid => {
    const hash = multihash.fromB58String(cid);
    const rawHash = multihash.decode(hash).digest;
    return StellarSdk.Keypair.fromRawEd25519Seed(rawHash);
};

export const networks = {
    public:  StellarSdk.Networks.PUBLIC,
    testnet: StellarSdk.Networks.TESTNET
};

export class Issuer {

    constructor({
        horizon = 'https://horizon.stellar.org',
        ipfs = '/ip4/127.0.0.1/tcp/5001',
        network = networks.public,
        postgres = null
    }) {
        this.horizon = new StellarSdk.Server(horizon);
        this.ipfs = ipfsAPI(ipfs);
        this.networkId = StellarSdk.hash(network);
        this.db = pgp()(postgres);
    }

    async addFederationRecord(hash, homeDomain, account) {
        return setFederation(this.db)(account, `${hash}*${homeDomain}`);
    };

    /**
     *
     * @param source Keypair
     * @param issuer Keypair
     * @param homeDomain string
     * @param data object
     * @param owner publicKey
     * @returns {Promise<*|{value}>}
     */
    async createToken(source, issuer, homeDomain, data, owner) {

        const signedObject = createSignedObject(issuer, data);
        const cid = getCID(signedObject);

        const dataBuf = Buffer.from(signedObject, 'utf-8');
        const results = await this.ipfs.files.add(dataBuf);
        const hash = results[0].hash;

        if (cid !== hash) {
            throw new Error('Mismatching CID for object');
        }

        const token = getKeypair(cid);
        await this.addFederationRecord(cid, homeDomain, token.publicKey());
        const account = await this.horizon.loadAccount(source.publicKey());
        const tx = transaction(account, homeDomain, token.publicKey(), owner);

        sign(tx, source, this.networkId);
        sign(tx, token, this.networkId);

        return this.horizon.submitTransaction(tx);
    }
}
