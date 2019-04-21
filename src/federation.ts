import * as pgp from 'pg-promise';

export function setFederation(
    db: pgp.IDatabase<any>
) {
    return async (id, name) => db.none({
        text: 'INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name=$2',
        values: [id, name]
    });
}

export function queryFederation(
    db: pgp.IDatabase<any>
) {

    return async (req, resp) => {

        const {type, q} = req.query;

        if (['name', 'id'].includes(type)) {
            const res = await db.oneOrNone({
                text: `SELECT * FROM users WHERE ${type} = $1`,
                values: [q]
            });

            if (res) {
                resp.json({
                    'stellar_address': res.name,
                    'account_id': res.id
                });
            }

            else {
                resp.status(404).json({
                    code: 'not_found',
                    message: 'Account not found'
                });
            }
        }

        else {
            resp.status(500).send();
        }
    }
}
