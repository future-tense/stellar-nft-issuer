# stellar-nft-issuer

Issuing *Non-fungible Tokens*, NFTs, on the Stellar network.

NFTs are a way of defining sets of items, where each item is distinguishably unique.

The most famous example currently is probably the CryptoKitties of Ethereum fame, but NFTs
can be used to represent ownership of both digital *and* physical assets.
Other examples might include land titles, artwork, in-game assets, and software licenses.

`stellar-nft-issuer` provides a javascript API, and a runtime environment, for issuing your own NFTs.

#### Implementation details

`stellar-nft-issuer` uses Stellar *accounts* to represent its tokens.

The metadata that uniquely defines a token is digitally signed by the issuer
before being stored as an IPFS object.

The IPFS *multi-hash*, in turn, is used as the secret key for the
account corresponding to a token.

An account uses its homedomain as a means of specifying its *token class*,
and as a way to lookup the public key used to verify its authenticity, **and**
(optionally) as a way of finding the *multi-hash* of the IPFS object that houses its metadata.

Ownership of a token is represented by signing rights. 

**NB:** Because tokens are implemented as *accounts*, they are not tradable on the Stellar DEX.

Since `stellar-nft` tokens are implemented using Stellar accounts,
they fall under the same minimum account balance requirements as regular accounts.

* 2 base reserves fees - the account itself
* 1 base reserve fee - the additional signer representing the owner
* 1 base reserve fee - as a buffer for one extra signer when transferring ownership (new signer has to be added before old signer is removed)

Currently that amounts to 2.0 XLM.

An extra base reserve fee would be added if/when a data entry is used instead of reverse federation.

# Installing

## Pre-requisites

To run this, you're going to need

* an IPFS server, for storing the token metadata
* a postgres database, for storing federation data (optional)
* a webserver/http proxy server, for serving the stellar.toml-file, and (optionally) doing reverse federation


## stellar.toml

https://${home_domain}/.well-known/stellar.toml

```
SIGNING_KEY={issuer public key}
FEDERATION_SERVER={}
```

## The federation server

stellar-nft NFTs uses reverse federation as way of looking up the CID of each token.

#### setting up the federation database

```
CREATE USER kittens WITH PASSWORD 'password';
CREATE DATABASE kittens;
GRANT ALL PRIVILEGES ON DATABASE kittens TO kittens;

\c kittens

CREATE TABLE users (
	id character(56) NOT NULL,
	name text NOT NULL,
	CONSTRAINT users_pkey PRIMARY KEY (id)
);

GRANT ALL PRIVILEGES ON TABLE users TO kittens;
```

## running the server

```
export DB_URL="postgres://kittens:password@localhost/kittens"
export PORT=8080
nft-federation-server
```


# Using the API

## Example

```javascript
import StellarSdk from 'stellar-sdk';
import {Issuer, networks} from 'stellar-nft-issuer';

(async function() {
    const issuer = new Issuer({
        horizon: 'https://horizon-testnet.stellar.org',
        network: networks.testnet,
        postgres: 'postgres://kittens:password@localhost/kittens'
    });

    const secret = 'SBRK2N55DHXWEDYP33AFKN2HYKVJGVVGKAVPOQEHARSEH5262OFS5BST';
    const owner = 'GCBRAY5LD7CBKCN3H5FMIN33LU4XFGTGCDKYXZPDLHUDEM2WVFNMIXCQ';
    const keys = StellarSdk.Keypair.fromSecret(secret);

    const data = {
        id: 1,
        name: 'Genesis',
        image_url: 'https://storage.googleapis.com/ck-kitty-image/0x06012c8cf97bead5deae237070f9587f8e7a266d/1.png'
    };

    const res = await issuer.createToken(keys, keys, 'kittens.futuretense.io', data, owner);
    console.log(res);
})();
```

Copyright © 2018 Future Tense, LLC
