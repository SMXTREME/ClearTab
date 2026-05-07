import jsonwebtoken from 'jsonwebtoken';

const SECRET = process.env.SECRET;

export async function read(token) {
    return await jsonwebtoken.verify(token, SECRET);
}

export async function write(query) {
    const data = await JSON.stringify(query);
    return jsonwebtoken.sign(data, SECRET);
}

const jwt = {
    read,
    write,
};

export default jwt;
