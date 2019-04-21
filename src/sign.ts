
import * as StellarSdk from 'stellar-sdk';

const typeTx = StellarSdk.xdr.EnvelopeType.envelopeTypeTx().toXDR();

function transactionHash(
    tx: StellarSdk.Transaction,
    networkId: Buffer
): Buffer {

    return StellarSdk.hash(
        Buffer.concat([
            networkId,
            typeTx,
            tx.tx.toXDR()
        ])
    );
}

export function sign(
    tx: StellarSdk.Transaction,
    keypair: StellarSdk.Keypair,
    networkId: Buffer
): void {

    const hash = transactionHash(tx, networkId);
    const sig = keypair.signDecorated(hash);
    tx.signatures.push(sig);
}
