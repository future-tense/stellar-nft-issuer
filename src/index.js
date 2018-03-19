
import StellarSDK from 'stellar-sdk';
import ipfsAPI from 'ipfs-api';
import pgp from 'pg-promise';
import {setFederation} from './federation';

const transaction = (account, homeDomain, token, owner) => {
    return new StellarSDK.TransactionBuilder(account)
    .addOperation(StellarSDK.Operation.createAccount({
        destination:     token,
        startingBalance: '1.5'
    }))
    .addOperation(StellarSDK.Operation.setOptions({
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

const signatureBase = (tx, networkId) => {
    return Buffer.concat([
        networkId,
        StellarSdk.xdr.EnvelopeType.envelopeTypeTx().toXDR(),
        tx.tx.toXDR()
    ]);
};

const transactionHash = (tx, networkId) => {
    const base = signatureBase(tx, networkId);
    return StellarSdk.hash(base);
};

const sign = (tx, keypair, networkId) => {
    const hash = transactionHash(tx, networkId);
    const sig = keypair.signDecorated(hash);
    tx.signatures.push(sig);
};

export const network = {
    public:  StellarSDK.Networks.PUBLIC,
    testnet: StellarSDK.Networks.TESTNET
};

export class Issuer {

    constructor({
        horizon = 'https://horizon.stellar.org',
        ipfs = '/ip4/127.0.0.1/tcp/5001',
        network = network.public,
        postgres = null
    }) {
        this.horizon = new StellarSDK.Server(horizon);
        this.ipfs = ipfsAPI(ipfs);
        this.networkId = StellarSDK.hash(network);
        this.db = pgp()(postgres);
    }

    async addFederationRecord(hash, homeDomain, account) {
        return setFederation(this.db)(account, `${hash}*${homeDomain}`);
    };

    async createToken(sourceKeys, homeDomain, data, owner) {

        const tokenKeys = StellarSDK.Keypair.random();
        const token = tokenKeys.publicKey();
        data.account = token;

        const dataJson = JSON.stringify(data);
        const dataBuf = Buffer.from(dataJson, 'utf-8');
        const results = await this.ipfs.files.add(dataBuf);
        const hash = results[0].hash;

        await this.addFederationRecord(hash, homeDomain, token);

        const source = sourceKeys.publicKey();
        const account = await this.horizon.loadAccount(source);
        const tx = transaction(account, homeDomain, token, owner);

        sign(tx, sourceKeys, this.networkId);
        sign(tx, tokenKeys, this.networkId);

        return this.horizon.submitTransaction(tx);
    }
}
