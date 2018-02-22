import auth from './functions/auth';
import decrypt from './functions/decrypt';

require('dotenv').config();

const handler = {
	auth,
	decrypt,
};

export default handler;
