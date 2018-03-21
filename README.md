# stellar-nft-issuer



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

    const res = await issuer.createToken(keys, 'kittens.futuretense.io', data, owner);
    console.log(res);
})();
```
