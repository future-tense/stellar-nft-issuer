
import StellarSdk from 'stellar-sdk';

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

export default sign;
