
export const setFederation = (db) => async (id, name) => {
    return db.none({
        text: 'INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name=$2',
        values: [id, name]
    })
};

export const queryFederation = (db) => async (req, resp) => {

    const {type, q} = req.query;

    if (['name', 'id'].includes(type)) {
        const res = await db.oneOrNone({
            text: `SELECT * FROM users WHERE ${type} = $1`,
            values: [q]
        });

	    if (res) {
    	    resp.json({
        	    'stellar_address':	res.name,
            	'account_id':		res.id
        	});
	    }

	    else {
    	    resp.status(404).json({
        	    code: 		'not_found',
            	message:	'Account not found'
	        });
    	}
    }

    else {
        resp.status(500).send();
    }
};
