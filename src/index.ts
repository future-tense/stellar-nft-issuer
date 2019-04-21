
import * as StellarSdk from 'stellar-sdk';
import * as ipfsClient from 'ipfs-http-client';
import * as bs58 from 'bs58';
import * as pgp from 'pg-promise';
import * as stringifySafe from 'json-stringify-safe';

import { setFederation } from './federation';
import { sign} from './sign';

export const Networks = StellarSdk.Networks;

type IssuerParams = {
    horizon: string,
    ipfs: string,
    network: string,
    postgres: string
}

export class Issuer {

    horizon: StellarSdk.Server;
    networkId: Buffer;
    db: pgp.IDatabase<any>;
    ipfs: any;

    constructor({
        horizon = 'https://horizon.stellar.org',
        ipfs = '/ip4/127.0.0.1/tcp/5001',
        network = Networks.PUBLIC,
        postgres
    }: IssuerParams) {
        this.horizon = new StellarSdk.Server(horizon);
        this.ipfs = ipfsClient(ipfs);
        this.networkId = StellarSdk.hash(network);
        this.db = pgp()(postgres);
    }

    async addFederationRecord(
        hash: string,
        homeDomain: string,
        account: string
    ) {
        return setFederation(this.db)(account, `${hash}*${homeDomain}`);
    };

    /**
     *
     * @param source Keypair
     * @param issuer Keypair
     * @param homeDomain string
     * @param data object
     * @param owner publicKey
     * @returns {Promise<Keypair>}
     */
    async createToken(
        source: StellarSdk.Keypair,
        issuer: StellarSdk.Keypair,
        homeDomain: string,
        data: {},
        owner: string
    ) {
        const signedObject = createSignedObject(issuer, data);
        const hash = StellarSdk.hash(signedObject);

        const dataBuf = Buffer.from(signedObject, 'utf-8');
        const results = await this.ipfs.files.add(dataBuf, {rawLeaves: true});

        const cid = getCID(hash);
        if (cid !== results[0].hash) {
            throw new Error('Mismatching CID for object');
        }

        const token = getKeypair(hash);
        await this.addFederationRecord(cid, homeDomain, token.publicKey());
        const account = await this.horizon.loadAccount(source.publicKey());
        const tx = transaction(account, homeDomain, token.publicKey(), owner, 100);

        sign(tx, source, this.networkId);
        sign(tx, token, this.networkId);

        await this.horizon.submitTransaction(tx);
        return token;
    }
}

function getKeypair(
    hash: Buffer
): StellarSdk.Keypair {
    return StellarSdk.Keypair.fromRawEd25519Seed(hash);
}

function createSignedObject(
    issuerKeys: StellarSdk.Keypair,
    data: {}
): string {

    const json = stringifySafe(data);
    const hash = StellarSdk.hash(json);
    const signature = issuerKeys.sign(hash).toString('base64');

    return stringifySafe({
        sig: signature,
        meta: data
    });
}

const PREFIX = Buffer.from('01551220', 'hex');

function getCID(
    hash: Buffer
): string {
    return 'z' + bs58.encode(Buffer.concat([PREFIX, hash]));
}

function transaction(
    account: StellarSdk.Server.AccountResponse,
    homeDomain: string,
    token: string,
    owner: string,
    fee: number
) {

    return new StellarSdk.TransactionBuilder(account, {fee: fee})
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
    .setTimeout(0)
    .build();
}
